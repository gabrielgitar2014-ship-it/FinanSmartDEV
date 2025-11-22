import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = useCallback(async () => {
    try {
      // Nota: RLS já garante que só veremos nossas categorias ou as de sistema.
      setLoading(true)
      const { data, error } = await supabase
        .from('categories')
        .select(`
            id, name, type, icon_slug, is_system_default
        `)
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error('Erro ao buscar categorias:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return { categories, loading, refetch: fetchCategories }
}
