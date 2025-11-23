import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { startOfMonth, endOfMonth, format, subMonths, addMonths, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useDateStore } from '../store/useDateStore'
import { useTransactionStore } from '../store/useTransactionStore'
import { useSyncStore } from '../store/useSyncStore'

export function useDashboard() {
  const currentDate = useDateStore((state) => state.currentDate)
  const syncVersion = useSyncStore((state) => state.syncVersion)

  // Stores Globais
  const transactionsCache = useTransactionStore((state) => state.transactionsCache)
  const totalBalance = useTransactionStore((state) => state.totalBalance)
  const creditCardLimit = useTransactionStore((state) => state.creditCardLimit) // <--- LINHA REINTEGRADA
  
  const setTransactionsForMonth = useTransactionStore((state) => state.setTransactionsForMonth)
  const setGlobalMetrics = useTransactionStore((state) => state.setGlobalMetrics)

  // Estado Local para Investimentos (Calculado na hora)
  const [totalInvested, setTotalInvested] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const currentMonthKey = format(currentDate, 'yyyy-MM')

  const fetchDataBatch = useCallback(async (forceRefresh = false) => {
    const currentCache = useTransactionStore.getState().transactionsCache
    
    // Se não for refresh forçado e tiver cache, não ativa loading visual
    if (!forceRefresh && currentCache[currentMonthKey]) {
       // Mantém execução para atualizar saldos globais em background
    } else {
       setLoading(true)
    }
    
    setError(null)

    try {
      const centerDate = currentDate
      const startDate = startOfMonth(subMonths(centerDate, 1)).toISOString()
      const endDate = endOfMonth(addMonths(centerDate, 1)).toISOString()

      // 1. BUSCAS GLOBAIS (Saldos)
      const { data: accounts } = await supabase.from('accounts').select('current_balance, type')
      
      // Separa Saldo Geral (Checking/Wallet) de Investimentos
      const balance = accounts?.reduce((acc, item) => {
        return item.type !== 'investment' ? acc + Number(item.current_balance) : acc
      }, 0) || 0

      const invested = accounts?.reduce((acc, item) => {
        return item.type === 'investment' ? acc + Number(item.current_balance) : acc
      }, 0) || 0
      
      setTotalInvested(invested)

      // Busca Limite de Cartões
      const { data: cards } = await supabase.from('credit_cards').select('limit_amount')
      const limit = cards?.reduce((acc, c) => acc + Number(c.limit_amount), 0) || 0

      // Atualiza Store Global
      setGlobalMetrics(balance, limit)

      // 2. Transações (Batch de 3 meses)
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

      // 3. Processamento e Cache
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
  }, [currentDate, currentMonthKey, setGlobalMetrics, setTransactionsForMonth]) 

  // Efeitos de Atualização
  useEffect(() => {
    fetchDataBatch(false)
  }, [fetchDataBatch])

  useEffect(() => {
    if (syncVersion > 0) fetchDataBatch(true)
  }, [syncVersion, fetchDataBatch])

  // Preparar dados para retorno
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
      totalInvested,
      monthIncome,
      monthExpense,
      creditCardLimit, // Agora está definido corretamente
      creditCardUsed: 0,
      recentTransactions: currentTransactions.slice(0, 5)
    }, 
    loading: loading && !transactionsCache[currentMonthKey],
    error, 
    refetch: () => fetchDataBatch(true)
  }
}