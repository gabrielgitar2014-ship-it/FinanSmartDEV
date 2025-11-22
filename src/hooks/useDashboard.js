import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { startOfMonth, endOfMonth, format, subMonths, addMonths, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useDateStore } from '../store/useDateStore'
import { useTransactionStore } from '../store/useTransactionStore'
import { useSyncStore } from '../store/useSyncStore'

export function useDashboard() {
  // 1. Estado Global de Data
  const currentDate = useDateStore((state) => state.currentDate)
  
  // 2. Estado de Sincronização
  const syncVersion = useSyncStore((state) => state.syncVersion)

  // 3. Stores de Dados (Apenas para leitura reativa no RETURN, não no fetch)
  const transactionsCache = useTransactionStore((state) => state.transactionsCache)
  const totalBalance = useTransactionStore((state) => state.totalBalance)
  const creditCardLimit = useTransactionStore((state) => state.creditCardLimit)
  const setTransactionsForMonth = useTransactionStore((state) => state.setTransactionsForMonth)
  const setGlobalMetrics = useTransactionStore((state) => state.setGlobalMetrics)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const currentMonthKey = format(currentDate, 'yyyy-MM')

  // --- FUNÇÃO DE BUSCA (CORRIGIDA PARA EVITAR LOOP) ---
  const fetchDataBatch = useCallback(async (forceRefresh = false) => {
    // CORREÇÃO CRÍTICA: Lemos o cache diretamente do estado atual para não criar dependência
    const currentCache = useTransactionStore.getState().transactionsCache
    
    if (!forceRefresh && currentCache[currentMonthKey]) {
      return // Já temos dados, aborta
    }

    // Só ativa loading visual se realmente não tivermos dados
    if (!currentCache[currentMonthKey]) {
      setLoading(true)
    }
    
    setError(null)

    try {
      const centerDate = currentDate
      const startDate = startOfMonth(subMonths(centerDate, 1)).toISOString()
      const endDate = endOfMonth(addMonths(centerDate, 1)).toISOString()

      // 1. Globais
      const { data: accounts } = await supabase.from('accounts').select('current_balance')
      const balance = accounts?.reduce((acc, item) => acc + Number(item.current_balance), 0) || 0

      const { data: cards } = await supabase.from('credit_cards').select('limit_amount')
      const limit = cards?.reduce((acc, c) => acc + Number(c.limit_amount), 0) || 0

      setGlobalMetrics(balance, limit)

      // 2. Transações (3 Meses)
      const { data: rawTransactions, error: transError } = await supabase
        .from('transactions')
        .select(`
          id, description, amount, type, date,
          categories ( name, icon_slug )
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (transError) throw transError

      // 3. Processamento
      const batchCache = {} 
      const keysToUpdate = [
        format(subMonths(centerDate, 1), 'yyyy-MM'),
        format(centerDate, 'yyyy-MM'),
        format(addMonths(centerDate, 1), 'yyyy-MM')
      ]
      keysToUpdate.forEach(k => batchCache[k] = [])

      rawTransactions?.forEach(t => {
        const tDate = new Date(t.date)
        if (isValid(tDate)) {
          const tMonthKey = format(tDate, 'yyyy-MM')
          if (batchCache[tMonthKey]) {
            batchCache[tMonthKey].push({
              id: t.id,
              label: t.description,
              amount: Number(t.amount),
              category: t.categories?.name || 'Geral',
              date: format(tDate, 'dd/MM', { locale: ptBR }),
              type: t.type,
              icon: t.categories?.icon_slug
            })
          }
        }
      })

      Object.keys(batchCache).forEach(key => {
        setTransactionsForMonth(key, batchCache[key])
      })

    } catch (err) {
      console.error('[useDashboard] Erro:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [currentDate, currentMonthKey, setGlobalMetrics, setTransactionsForMonth]) // REMOVIDO: transactionsCache da dependência

  // --- EFEITOS ---
  useEffect(() => {
    fetchDataBatch(false)
  }, [fetchDataBatch])

  useEffect(() => {
    if (syncVersion > 0) fetchDataBatch(true)
  }, [syncVersion, fetchDataBatch])

  // --- RETORNO ---
  const currentTransactions = transactionsCache[currentMonthKey] || []
  
  const monthIncome = currentTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0)

  const monthExpense = currentTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0)

  return { 
    data: {
      totalBalance,
      monthIncome,
      monthExpense,
      creditCardLimit,
      creditCardUsed: 0,
      recentTransactions: currentTransactions.slice(0, 5)
    }, 
    loading: loading && !transactionsCache[currentMonthKey],
    error, 
    refetch: () => fetchDataBatch(true)
  }
}