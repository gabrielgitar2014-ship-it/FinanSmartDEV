import { useState, useEffect, useCallback } from 'react';
import { accountsService } from '../services/accounts';

export function useAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await accountsService.fetchAll();
      setAccounts(data);
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar contas:', err);
      setError('Falha ao carregar contas.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar ao montar
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const addAccount = async (accountData) => {
    try {
      const newAccount = await accountsService.create(accountData);
      setAccounts((prev) => [...prev, newAccount]); // Atualização otimista local
      return newAccount;
    } catch (err) {
      setError('Erro ao criar conta.');
      throw err;
    }
  };

  const updateAccount = async (id, updates) => {
    try {
      const updated = await accountsService.update(id, updates);
      setAccounts((prev) => prev.map(acc => acc.id === id ? updated : acc));
      return updated;
    } catch (err) {
      setError('Erro ao atualizar conta.');
      throw err;
    }
  };

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts,
    addAccount,
    updateAccount
  };
}