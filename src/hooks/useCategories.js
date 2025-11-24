import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useDateStore } from '../store/useDateStore'
import { useSyncStore } from '../store/useSyncStore'
import { startOfMonth, endOfMonth } from 'date-fns'

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  
  const currentDate = useDateStore(state => state.currentDate)
  const syncVersion = useSyncStore(state => state.syncVersion)

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      
      // 1. BUSCAR TODAS AS CATEGORIAS
      // Nota: Buscamos todas (sistema + custom) para permitir uso em transações
      // A filtragem de gerenciamento é feita no componente
      const { data: allCategories, error } = await supabase
        .from('categories')
        .select('id, name, type, icon_slug, is_system_default')
        .order('name')

      if (error) throw error
      
      if (!allCategories || allCategories.length === 0) {
        setCategories([])
        setLoading(false)
        return
      }

      const allIds = allCategories.map(c => c.id)

      // 2. Buscar Gastos do Mês Atual (para exibição na tela de gerenciamento)
      const dateRange = {
        start: startOfMonth(currentDate).toISOString(),
        end: endOfMonth(currentDate).toISOString(),
      }
      
      const { data: spendingData, error: spendingError } = await supabase
        .from('transactions')
        .select('category_id, amount, type')
        .in('category_id', allIds)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)

      if (spendingError) throw spendingError

      // 3. Calcular total gasto POR CATEGORIA
      const spendingMap = (spendingData || []).reduce((acc, tx) => {
        if (!tx.category_id) return acc
        
        const id = tx.category_id
        const amount = Math.abs(Number(tx.amount)) // Sempre positivo para visualização
        
        acc[id] = (acc[id] || 0) + amount
        return acc
      }, {})

      // 4. Merge final
      const finalCategories = allCategories.map(cat => ({
        ...cat,
        totalSpent: spendingMap[cat.id] || 0,
      }))
      
      setCategories(finalCategories)
      
    } catch (err) {
      console.error('[useCategories] Erro:', err)
      setCategories([])
    } finally {
      setLoading(false)
    }
  }, [currentDate, syncVersion])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return { 
    categories, 
    loading, 
    refetch: fetchCategories 
  }
}