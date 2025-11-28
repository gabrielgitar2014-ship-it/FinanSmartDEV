import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useSyncStore } from '../store/useSyncStore'

export function useAccounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const syncVersion = useSyncStore((state) => state.syncVersion)

  const fetchAccounts = useCallback(async () => {
    try {
      // Só mostra loading na primeira carga
      setLoading(prev => prev === false ? false : true)
      setError(null)

      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_archived', false) // Ignora contas arquivadas
        .order('created_at', { ascending: true })

      if (error) throw error

      setAccounts(data || [])

    } catch (err) {
      console.error('[useAccounts] Erro:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts, syncVersion])

  // --- FUNÇÃO: ATUALIZAR CONTA ---
  const updateAccount = async (accountId, updates) => {
    try {
      // Validação básica
      if (!accountId) throw new Error('ID da conta é obrigatório')

      const { error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', accountId)

      if (error) throw error
      
      // Atualiza localmente para feedback imediato
      setAccounts(prev => 
        prev.map(acc => acc.id === accountId ? { ...acc, ...updates } : acc)
      )
      
      // Recarrega do banco para garantir consistência
      setTimeout(() => fetchAccounts(), 500)
      
      return { success: true }
    } catch (err) {
      console.error('[updateAccount] Erro:', err)
      return { success: false, error: err.message }
    }
  }

  // --- FUNÇÃO: ARQUIVAR CONTA (ao invés de deletar) ---
  const archiveAccount = async (accountId) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ is_archived: true })
        .eq('id', accountId)

      if (error) throw error
      
      await fetchAccounts()
      return { success: true }
    } catch (err) {
      console.error('[archiveAccount] Erro:', err)
      return { success: false, error: err.message }
    }
  }

  return { 
    accounts, 
    loading, 
    error, 
    refetch: fetchAccounts,
    updateAccount,
    archiveAccount
  }
}