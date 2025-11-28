import { v4 as uuidv4 } from 'uuid';
import { parse, format, addMonths, setDate, isValid, lastDayOfMonth } from 'date-fns';

// Limpa valor monetário (R$ 1.200,50 -> 1200.50)
const cleanAmount = (val) => {
  const v = parseFloat(val.toString().replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
  return isNaN(v) ? 0 : v;
};

export const generateInstallments = (transactions, referenceMonthStr, accountId) => {
  const expandedTransactions = [];
  
  // Data base da fatura (ex: 2025-09-01)
  const refDate = parse(referenceMonthStr, 'yyyy-MM', new Date());

  transactions.forEach(tx => {
    // Se já foi processado ou não tem parcelas, mantém simples
    if (!tx.installment || !tx.installment.includes('/')) {
      expandedTransactions.push({
        ...tx,
        id: uuidv4(), // Novo ID para o banco
        account_id: accountId,
        amount: cleanAmount(tx.value),
        date: tx.date ? format(setDate(refDate, parseInt(tx.date.split('/')[0])), 'yyyy-MM-dd') : format(refDate, 'yyyy-MM-dd'),
        status: 'completed', // Está na fatura atual
        installment_number: 1,
        installment_total: 1
      });
      return;
    }

    // Lógica de Parcelamento
    try {
      const [curr, total] = tx.installment.split('/').map(n => parseInt(n));
      const groupId = uuidv4();
      
      // Dia da compra (ex: 07/11 -> 07)
      let purchaseDay = parseInt(tx.date.split('/')[0]) || 1;
      
      // Data base ajustada para o dia da compra
      let anchorDate = setDate(refDate, purchaseDay);
      if (anchorDate > lastDayOfMonth(refDate)) anchorDate = lastDayOfMonth(refDate);

      // Gera TODAS as parcelas (passado, presente, futuro)
      for (let i = 1; i <= total; i++) {
        const offset = i - curr; // Ex: parcela 1 (i) - parcela atual 10 (curr) = -9 meses
        const date = addMonths(anchorDate, offset);
        
        let status = 'scheduled';
        if (i < curr) status = 'completed'; // Passado (já pago)
        else if (i === curr) status = 'pending'; // Fatura atual

        expandedTransactions.push({
          id: uuidv4(),
          description: `${tx.description} (${i}/${total})`,
          amount: cleanAmount(tx.value),
          type: 'expense',
          date: format(date, 'yyyy-MM-dd'),
          account_id: accountId,
          category_id: tx.category_id || null,
          installment_number: i,
          installment_total: total,
          installment_id: groupId,
          status: status,
          original_description: tx.description // Útil para UI
        });
      }
    } catch (e) {
      console.error("Erro ao expandir:", tx, e);
    }
  });

  return expandedTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
};