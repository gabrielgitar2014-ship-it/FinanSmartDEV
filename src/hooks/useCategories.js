import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { SYSTEM_CATEGORIES } from '../constants/categories'
import { useDateStore } from '../store/useDateStore'
import { useSyncStore } from '../store/useSyncStore'
import { startOfMonth, endOfMonth } from 'date-fns'

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Dependencies for fetching usage data
  const currentDate = useDateStore(state => state.currentDate)
  const syncVersion = useSyncStore(state => state.syncVersion) // For real-time updates

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      
      // 1. Fetch CUSTOM Categories (user-created only)
      const { data: customCategories, error } = await supabase
        .from('categories')
        .select(`id, name, type, icon_slug, is_system_default`)
        .eq('is_system_default', false) // <--- CRITICAL FILTER: ONLY CUSTOM
        .order('name')

      if (error) throw error
      
      const customIds = (customCategories || []).map(c => c.id)

      // 2. Fetch Spending for the Selected Month (Aggregate)
      const dateRange = {
        start: startOfMonth(currentDate).toISOString(),
        end: endOfMonth(currentDate).toISOString(),
      }
      
      // Query to aggregate spending by category ID for the current month
      // Note: We select only the category_ids we care about (customIds)
      const { data: spendingData, error: spendingError } = await supabase
        .from('transactions')
        .select('category_id, amount, type')
        .in('category_id', customIds)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)

      if (spendingError) throw spendingError

      // 3. Process Usage Data: Group by category_id and sum only expenses
      const spendingMap = spendingData.reduce((acc, tx) => {
        if (!tx.category_id || tx.type !== 'expense') return acc; // Ignore income for spending total
        
        const id = tx.category_id;
        const amount = Number(tx.amount); // Amount is already negative from insertion
        
        acc[id] = (acc[id] || 0) + amount;
        return acc;
      }, {});

      // 4. Merge Data: Combine usage with the category object
      const finalCategories = customCategories.map(cat => ({
        ...cat,
        // We want the absolute value for display purposes (R$ 100,00 spent)
        totalSpent: Math.abs(spendingMap[cat.id] || 0), 
      }));
      
      // The hook must still return ALL categories (System + Custom) because AddTransactionModal needs them.
      // But the CategoriesPage will only render the 'finalCategories' (custom ones).
      const allCategories = [...SYSTEM_CATEGORIES, ...finalCategories];
      
      setCategories(allCategories);
      
    } catch (err) {
      console.error('[useCategories] Erro:', err);
      // Fallback: If DB fails, we still show the static list for robustness
      setCategories(SYSTEM_CATEGORIES); 
    } finally {
      setLoading(false);
    }
  }, [currentDate, syncVersion]); 

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Exportamos a lista completa (para o modal) e a função de refresh
  return { categories, loading, refetch: fetchCategories };
}
