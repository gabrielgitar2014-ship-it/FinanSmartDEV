// ===============================================
//  billingService.js
//  Módulo de inteligência de faturas do FinanSmart
//  Autor: Nova (Assistente do Gabriel)
// ===============================================

import { addMonths, endOfMonth, startOfMonth, getDate, isWithinInterval } from "date-fns";

/* ----------------------------------------------------------
   FUNÇÃO: calcular o ciclo de fatura (início e fim)
   - Usa closing_day e due_day do cartão
   - Retorna:
      {
        periodStart,
        periodEnd
      }
   ---------------------------------------------------------- */
export function getBillingCycle(card, referenceDate = new Date()) {
  if (!card?.closing_day) {
    throw new Error("Cartão sem 'closing_day'. Verifique o registro no banco.");
  }

  const closing = card.closing_day;
  const day = getDate(referenceDate);

  let cycleStart;
  let cycleEnd;

  // Caso A — Ainda não passou o fechamento do mês atual
  if (day <= closing) {
    cycleStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, closing + 1);
    cycleEnd   = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), closing);
  }

  // Caso B — Já passou o fechamento, então estamos no ciclo seguinte
  else {
    cycleStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), closing + 1);
    cycleEnd   = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, closing);
  }

  return { periodStart: cycleStart, periodEnd: cycleEnd };
}

/* ----------------------------------------------------------
   FUNÇÃO: ajustar a data da transação à vista
   Regra:
     - Se purchaseDay >= closing_day → cai no próximo ciclo
   ---------------------------------------------------------- */
export function computeEffectiveDate(card, purchaseDate) {
  const dateObj = new Date(purchaseDate + "T12:00:00");

  const purchaseDay = getDate(dateObj);
  const closing = card.closing_day;

  if (purchaseDay >= closing) {
    const adjusted = addMonths(dateObj, 1);
    return adjusted.toISOString().split("T")[0];
  }

  return dateObj.toISOString().split("T")[0];
}

/* ----------------------------------------------------------
   FUNÇÃO: saber se uma transação pertence à fatura atual
   ---------------------------------------------------------- */
export function isTransactionInCurrentCycle(card, transactionDate, referenceDate = new Date()) {
  const { periodStart, periodEnd } = getBillingCycle(card, referenceDate);
  const txDate = new Date(transactionDate + "T12:00:00");

  return isWithinInterval(txDate, { start: periodStart, end: periodEnd });
}

/* ----------------------------------------------------------
   FUNÇÃO: saber em qual fatura a transação cai
   - "current"
   - "next"
   ---------------------------------------------------------- */
export function getTransactionInvoiceSlot(card, transactionDate, referenceDate = new Date()) {
  if (isTransactionInCurrentCycle(card, transactionDate, referenceDate)) {
    return "current";
  }

  return "next";
}

/* ----------------------------------------------------------
   FUNÇÃO: gerar cronograma de parcelas
   Exemplo:
     generateInstallments(card, "2025-01-10", 1000, 10)
   ---------------------------------------------------------- */
export function generateInstallments(card, purchaseDate, totalAmount, count) {
  const purchase = new Date(purchaseDate + "T12:00:00");
  const closing = card.closing_day;

  const purchaseDay = getDate(purchase);
  const startOffset = purchaseDay >= closing ? 1 : 0;

  const installmentValue = totalAmount / count;
  const installments = [];

  for (let i = 0; i < count; i++) {
    const date = addMonths(purchase, i + startOffset);

    installments.push({
      number: i + 1,
      total: count,
      amount: installmentValue,
      date: date.toISOString().split("T")[0]
    });
  }

  return installments;
}

/* ----------------------------------------------------------
   FUNÇÃO: calcular limite comprometido com parcelas futuras
   ---------------------------------------------------------- */
export function calculateCommittedLimit(card, transactions) {
  let total = 0;

  for (const t of transactions) {
    if (t.credit_card_id !== card.id) continue;

    // Apenas parcelas futuras contam como "comprometidas"
    const isFuture =
      getTransactionInvoiceSlot(card, t.date, new Date()) === "next" ||
      new Date(t.date) > new Date();

    if (isFuture) total += Math.abs(Number(t.amount));
  }

  return total;
}

/* ----------------------------------------------------------
   FUNÇÃO: agrupar transações por fatura
   - Atual
   - Próxima
   ---------------------------------------------------------- */
export function splitTransactionsByInvoice(card, transactions, referenceDate = new Date()) {
  const current = [];
  const next = [];

  for (const t of transactions) {
    const slot = getTransactionInvoiceSlot(card, t.date, referenceDate);

    if (slot === "current") current.push(t);
    else next.push(t);
  }

  return {
    currentInvoice: current,
    nextInvoice: next
  };
}

/* ----------------------------------------------------------
   FUNÇÃO: calcular total de fatura atual e futura
   ---------------------------------------------------------- */
export function calculateInvoiceTotals(card, transactions, referenceDate = new Date()) {
  const { currentInvoice, nextInvoice } = splitTransactionsByInvoice(card, transactions, referenceDate);

  const totalCurrent = currentInvoice.reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
  const totalNext = nextInvoice.reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);

  return {
    currentInvoiceTotal: totalCurrent,
    nextInvoiceTotal: totalNext
  };
}

/* ----------------------------------------------------------
   FUNÇÃO: gerar um resumo completo da fatura
   ---------------------------------------------------------- */
export function getFullInvoiceSummary(card, transactions, referenceDate = new Date()) {
  const cycle = getBillingCycle(card, referenceDate);
  const totals = calculateInvoiceTotals(card, transactions, referenceDate);
  const { currentInvoice, nextInvoice } = splitTransactionsByInvoice(card, transactions, referenceDate);

  const committedLimit = calculateCommittedLimit(card, transactions);

  return {
    billingPeriod: cycle,
    currentInvoice: {
      total: totals.currentInvoiceTotal,
      transactions: currentInvoice
    },
    nextInvoice: {
      total: totals.nextInvoiceTotal,
      transactions: nextInvoice
    },
    committedLimit,
    availableLimitAfterFuture:
      card.available_limit !== undefined
        ? card.available_limit - committedLimit
        : null
  };
}

