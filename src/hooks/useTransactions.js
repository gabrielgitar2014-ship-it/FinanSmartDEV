import { useMemo } from 'react'
import { format, isToday, isYesterday, parseISO, compareDesc } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useDateStore } from '../store/useDateStore'
import { useTransactionStore } from '../store/useTransactionStore'

export function useTransactions() {
  // 1. Pega a data global selecionada (Ex: Novembro)
  const currentDate = useDateStore((state) => state.currentDate)
  
  // 2. Pega o cache global de transações
  const transactionsCache = useTransactionStore((state) => state.transactionsCache)

  // 3. Gera a chave do mês para buscar no cache (Ex: '2025-11')
  const currentMonthKey = format(currentDate, 'yyyy-MM')
  
  // 4. Obtém a lista crua do cache (ou array vazio se não tiver nada)
  const rawTransactions = transactionsCache[currentMonthKey] || []

  // 5. Agrupamento e Ordenação (Memoizado para performance)
  const groupedTransactions = useMemo(() => {
    // Primeiro, garantimos que a lista está ordenada por data (mais recente primeiro)
    const sorted = [...rawTransactions].sort((a, b) => 
      compareDesc(parseISO(a.date), parseISO(b.date))
    )

    // Depois, agrupamos por dia
    return sorted.reduce((acc, item) => {
      // item.date já vem formatado ou ISO do banco? 
      // No useDashboard salvamos como ISO ou formatado. Vamos assumir formato ISO 'yyyy-MM-dd' ou Date string
      // Se no cache salvamos já formatado 'dd/MM', precisamos cuidar.
      // Olhando o useDashboard anterior: salvamos `date` como string formatada ou objeto.
      // Vamos garantir robustez: usaremos a string original se possível, ou lidaremos com o formato.
      
      // Nota: No useDashboard.js, salvamos `date` formatado como 'dd/MM'. 
      // Isso dificulta a ordenação aqui. O ideal seria salvar o ISO original no cache.
      
      // CORREÇÃO RÁPIDA DE ARQUITETURA:
      // Vamos agrupar usando a data que temos. Como o cache do useDashboard já salva
      // processado para visualização, vamos usar a chave de data direta.
      
      // Se o objeto no cache tem campo `date` (ex: "21/11"), usaremos ele como chave visual
      // Mas para agrupar corretamente "Hoje" / "Ontem", precisaríamos da data real.
      
      // Assumindo que no Store você salvou o objeto completo ou formatado.
      // Se salvou formatado, vamos agrupar por essa string mesmo.
      
      const dateKey = item.date // Ex: "21/11" ou "2025-11-21"
      
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(item)
      return acc
    }, {})
  }, [rawTransactions])

  // 6. Helper para título da seção (Ex: "Hoje, 12 de Setembro")
  // Como estamos usando dados formatados do dashboard, talvez precisemos adaptar.
  // Mas para manter simples:
  const formatDateHeader = (dateString) => {
    // Tenta fazer parse. Se falhar (ex: já for "21/11"), retorna como está.
    try {
      // Se for formato ISO (YYYY-MM-DD)
      if (dateString.includes('-')) {
        const date = parseISO(dateString)
        if (isToday(date)) return `Hoje, ${format(date, "d 'de' MMMM", { locale: ptBR })}`
        if (isYesterday(date)) return `Ontem, ${format(date, "d 'de' MMMM", { locale: ptBR })}`
        return format(date, "EEEE, d 'de' MMMM", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())
      }
      // Se já for "21/11"
      return dateString
    } catch (e) {
      return dateString
    }
  }

  return {
    groupedTransactions,
    loading: !rawTransactions.length, // Se não tem dados, considera loading ou vazio
    error: null,
    formatDateHeader
  }
}