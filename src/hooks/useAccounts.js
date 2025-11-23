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
      setLoading(prev => prev === false ? false : true)
      setError(null)

      const { data, error } = await supabase
        .from('accounts')
        .select('*')
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

  // --- NOVA FUNÇÃO: ATUALIZAR CONTA ---
  const updateAccount = async (accountId, updates) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', accountId)

      if (error) throw error
      
      // Atualiza a lista localmente para feedback instantâneo
      fetchAccounts()
      return { success: true }
    } catch (err) {
      console.error('Erro ao atualizar:', err)
      return { success: false, error: err.message }
    }
  }

  return { 
    accounts, 
    loading, 
    error, 
    refetch: fetchAccounts,
    updateAccount // <--- Exportando a nova função
  }
}