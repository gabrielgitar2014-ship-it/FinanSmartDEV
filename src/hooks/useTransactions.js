import { useState, useEffect, useCallback } from 'react';
import { transactionsService } from '../services/transactions';

export function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estado de filtros (Mês atual por padrão)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await transactionsService.fetchByMonth(currentMonth, currentYear);
      setTransactions(data);
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar transações:', err);
      setError('Falha ao carregar transações.');
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Funções de manipulação de data
  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const addTransaction = async (data) => {
    try {
      // Apenas recarregamos tudo para garantir a ordem e os Joins corretos
      // Otimização futura: inserir manualmente na lista se for do mês atual
      await transactionsService.create(data);
      await fetchTransactions(); 
    } catch (err) {
      throw err;
    }
  };

  const deleteTransaction = async (id) => {
    try {
        await transactionsService.delete(id);
        setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
        throw err;
    }
  };

  return {
    transactions,
    loading,
    error,
    dateFilter: { month: currentMonth, year: currentYear, nextMonth, prevMonth },
    addTransaction,
    deleteTransaction,
    refetch: fetchTransactions
  };
}