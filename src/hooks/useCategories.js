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
      
      // 1. BUSCAR TODAS AS CATEGORIAS DO BANCO (Sistema + Custom)
      // Removemos o filtro .eq('is_system_default', false) para trazer tudo
      const { data: allCategories, error } = await supabase
        .from('categories')
        .select(`id, name, type, icon_slug, is_system_default`)
        .order('name')

      if (error) throw error
      
      const allIds = (allCategories || []).map(c => c.id)

      // 2. Buscar Gastos (Opcional, para a tela de gerenciamento)
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

      const spendingMap = spendingData.reduce((acc, tx) => {
        if (!tx.category_id) return acc;
        // Soma despesas (se for expense) ou receitas (se for income)
        // Para simplificar visualização, somamos o valor absoluto
        const id = tx.category_id;
        const amount = Math.abs(Number(tx.amount));
        
        acc[id] = (acc[id] || 0) + amount;
        return acc;
      }, {});

      // 3. Merge final
      const finalCategories = allCategories.map(cat => ({
        ...cat,
        totalSpent: spendingMap[cat.id] || 0, 
      }));
      
      setCategories(finalCategories);
      
    } catch (err) {
      console.error('[useCategories] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate, syncVersion]); 

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, refetch: fetchCategories };
}
