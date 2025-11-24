// ===============================================
//  billingService.js
//  Módulo de inteligência de faturas do FinanSmart
// ===============================================

import {
  addMonths,
  getDate,
  isWithinInterval,
  isAfter,
} from "date-fns";

/* ----------------------------------------------------------
   FUNÇÃO: calcular o ciclo de fatura (início e fim)
   - Usa closing_day do cartão
   - Sempre devolve o ciclo onde a referenceDate está
   ---------------------------------------------------------- */
export function getBillingCycle(card, referenceDate = new Date()) {
  if (!card?.closing_day) {
    throw new Error("Cartão sem 'closing_day'. Verifique o registro no banco.");
  }

  const closing = card.closing_day;
  const date = new Date(referenceDate);
  const day = getDate(date);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11

  let cycleStart;
  let cycleEnd;

  // Caso A — Ainda não passou o fechamento neste mês
  // Ex.: hoje 05/11, fechamento 10 → ciclo atual = 11/10 - 10/11
  if (day <= closing) {
    cycleStart = new Date(year, month - 1, closing + 1);
    cycleEnd = new Date(year, month, closing);
  } else {
    // Caso B — Já passou o fechamento neste mês
    // Ex.: hoje 20/11, fechamento 10 → ciclo atual = 11/11 - 10/12
    cycleStart = new Date(year, month, closing + 1);
    cycleEnd = new Date(year, month + 1, closing);
  }

  return { periodStart: cycleStart, periodEnd: cycleEnd };
}

/* ----------------------------------------------------------
   FUNÇÃO: próximo ciclo de fatura em relação ao atual
   ---------------------------------------------------------- */
export function getNextBillingCycle(card, referenceDate = new Date()) {
  const { periodStart, periodEnd } = getBillingCycle(card, referenceDate);

  return {
    periodStart: addMonths(periodStart, 1),
    periodEnd: addMonths(periodEnd, 1),
  };
}

/* ----------------------------------------------------------
   FUNÇÃO: ajustar a data efetiva de uma compra à vista no cartão
   Regra:
     - Se o dia da compra >= closing_day → cai no próximo ciclo
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
   FUNÇÃO: saber se uma transação está no ciclo atual
   ---------------------------------------------------------- */
export function isTransactionInCurrentCycle(
  card,
  transactionDate,
  referenceDate = new Date()
) {
  const { periodStart, periodEnd } = getBillingCycle(card, referenceDate);
  const txDate = new Date(transactionDate + "T12:00:00");

  return isWithinInterval(txDate, { start: periodStart, end: periodEnd });
}

/* ----------------------------------------------------------
   FUNÇÃO: classificar transação em relação ao ciclo atual
   - "past"   → antes do ciclo atual
   - "current"→ dentro do ciclo atual
   - "next"   → dentro do próximo ciclo
   - "future" → depois do próximo ciclo
   ---------------------------------------------------------- */
export function classifyTransaction(
  card,
  transactionDate,
  referenceDate = new Date()
) {
  const txDate = new Date(transactionDate + "T12:00:00");

  const current = getBillingCycle(card, referenceDate);
  const next = getNextBillingCycle(card, referenceDate);

  if (isWithinInterval(txDate, { start: current.periodStart, end: current.periodEnd })) {
    return "current";
  }

  if (isWithinInterval(txDate, { start: next.periodStart, end: next.periodEnd })) {
    return "next";
  }

  if (txDate < current.periodStart) return "past";

  if (txDate > next.periodEnd) return "future";

  // Default de segurança
  return "other";
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
      date: date.toISOString().split("T")[0],
    });
  }

  return installments;
}

/* ----------------------------------------------------------
   FUNÇÃO: agrupar transações em fatura atual e próxima fatura
   - só considera 2 ciclos:
     - ciclo atual (contém hoje / referenceDate)
     - próximo ciclo imediatamente seguinte
   - transações de ciclos passados ou muito futuros são ignoradas
   ---------------------------------------------------------- */
export function splitTransactionsByInvoice(
  card,
  transactions,
  referenceDate = new Date()
) {
  const current = getBillingCycle(card, referenceDate);
  const next = getNextBillingCycle(card, referenceDate);

  const currentInvoice = [];
  const nextInvoice = [];

  for (const t of transactions || []) {
    if (!t?.date) continue;

    const txDate = new Date(t.date + "T12:00:00");

    if (isWithinInterval(txDate, { start: current.periodStart, end: current.periodEnd })) {
      currentInvoice.push(t);
    } else if (
      isWithinInterval(txDate, { start: next.periodStart, end: next.periodEnd })
    ) {
      nextInvoice.push(t);
    }
  }

  return {
    currentPeriod: current,
    nextPeriod: next,
    currentInvoice,
    nextInvoice,
  };
}

/* ----------------------------------------------------------
   FUNÇÃO: calcular total de fatura atual e próxima fatura
   ---------------------------------------------------------- */
export function calculateInvoiceTotals(
  card,
  transactions,
  referenceDate = new Date()
) {
  const { currentInvoice, nextInvoice } = splitTransactionsByInvoice(
    card,
    transactions,
    referenceDate
  );

  const totalCurrent = currentInvoice.reduce(
    (acc, t) => acc + Math.abs(Number(t.amount || 0)),
    0
  );
  const totalNext = nextInvoice.reduce(
    (acc, t) => acc + Math.abs(Number(t.amount || 0)),
    0
  );

  return {
    currentInvoiceTotal: totalCurrent,
    nextInvoiceTotal: totalNext,
  };
}

/* ----------------------------------------------------------
   FUNÇÃO: limite comprometido com faturas futuras
   Regra:
     - Soma tudo que é a partir do PRÓXIMO ciclo (inclusive)
     - Ou seja, a partir de nextPeriod.start
   ---------------------------------------------------------- */
export function calculateCommittedLimit(
  card,
  transactions,
  referenceDate = new Date()
) {
  const { nextPeriod } = splitTransactionsByInvoice(card, transactions, referenceDate);

  if (!nextPeriod) return 0;

  let total = 0;

  for (const t of transactions || []) {
    if (!t?.date) continue;
    const txDate = new Date(t.date + "T12:00:00");

    if (isAfter(txDate, nextPeriod.periodStart) || +txDate === +nextPeriod.periodStart) {
      total += Math.abs(Number(t.amount || 0));
    }
  }

  return total;
}

/* ----------------------------------------------------------
   FUNÇÃO: resumo completo de fatura para o CardDetailPage
   - Adapta automaticamente ao tempo (referenceDate = hoje)
   - Quando troca o mês, o "current" passa a ser o ciclo novo
   - E o "next" vira o ciclo seguinte
   ---------------------------------------------------------- */
export function getFullInvoiceSummary(
  card,
  transactions,
  referenceDate = new Date()
) {
  const {
    currentPeriod,
    nextPeriod,
    currentInvoice,
    nextInvoice,
  } = splitTransactionsByInvoice(card, transactions, referenceDate);

  const { currentInvoiceTotal, nextInvoiceTotal } = calculateInvoiceTotals(
    card,
    transactions,
    referenceDate
  );

  const committedLimit = calculateCommittedLimit(
    card,
    transactions,
    referenceDate
  );

  const availableLimit =
    card.available_limit !== undefined && card.available_limit !== null
      ? Number(card.available_limit)
      : null;

  return {
    currentPeriod,
    nextPeriod,
    currentInvoice: {
      total: currentInvoiceTotal,
      transactions: currentInvoice,
    },
    nextInvoice: {
      total: nextInvoiceTotal,
      transactions: nextInvoice,
    },
    committedLimit,
    availableLimitAfterFuture:
      availableLimit !== null ? availableLimit - committedLimit : null,
  };
}
