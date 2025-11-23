import { useMemo } from 'react'
import { format, isToday, isYesterday, parseISO, compareDesc } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useDateStore } from '../store/useDateStore'
import { useTransactionStore } from '../store/useTransactionStore'

export function useTransactions() {
  // 1. Data Global
  const currentDate = useDateStore((state) => state.currentDate)
  
  // 2. Store Global (Dados + Status)
  const transactionsCache = useTransactionStore((state) => state.transactionsCache)
  const fetchedMonths = useTransactionStore((state) => state.fetchedMonths)

  // 3. Chave do Mês Atual
  const currentMonthKey = format(currentDate, 'yyyy-MM')
  
  // 4. Dados
  const rawTransactions = transactionsCache[currentMonthKey] || []
  
  // 5. Status de Loading CORRIGIDO
  // Só está carregando se a flag 'fetchedMonths' para este mês for falsa/undefined
  const loading = !fetchedMonths[currentMonthKey]

  // 6. Agrupamento (Memoizado)
  const groupedTransactions = useMemo(() => {
    if (loading || rawTransactions.length === 0) return {}

    const sorted = [...rawTransactions].sort((a, b) => {
       // Garante ordenação segura mesmo com formatos de data mistos
       const dateA = new Date(a.date.includes('/') ? a.date.split('/').reverse().join('-') : a.date)
       const dateB = new Date(b.date.includes('/') ? b.date.split('/').reverse().join('-') : b.date)
       return compareDesc(dateA, dateB)
    })

    return sorted.reduce((acc, item) => {
      // Tenta normalizar a chave de agrupamento
      let dateKey = item.date
      // Se estiver no formato BR (dd/MM), tentamos manter a consistência
      // Para o MVP, vamos agrupar pela string de data que veio do Dashboard
      
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(item)
      return acc
    }, {})
  }, [rawTransactions, loading])

  // 7. Helper de Título
  const formatDateHeader = (dateString) => {
    try {
      // Se for ISO YYYY-MM-DD
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = parseISO(dateString)
        if (isToday(date)) return `Hoje, ${format(date, "d 'de' MMMM", { locale: ptBR })}`
        if (isYesterday(date)) return `Ontem, ${format(date, "d 'de' MMMM", { locale: ptBR })}`
        return format(date, "EEEE, d 'de' MMMM", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())
      }
      // Se já vier formatado "21/11" (fallback)
      return dateString
    } catch (e) {
      return dateString
    }
  }

  return {
    groupedTransactions,
    loading, // Agora retorna false se estiver vazio mas já tiver carregado
    error: null,
    refetch: () => {}, // O refetch real é feito pelo Dashboard/SyncStore
    formatDateHeader
  }
}
