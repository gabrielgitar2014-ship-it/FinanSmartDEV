import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { SYSTEM_CATEGORIES } from '../constants/categories' // <-- Importa o arquivo de constantes locais

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      
      // Busca APENAS as categorias personalizadas do usuário no banco (is_system_default: false)
      const { data: customCategories, error } = await supabase
        .from('categories')
        .select(`
            id, name, type, icon_slug, is_system_default
        `)
        .eq('is_system_default', false) 
        .order('name')

      if (error) throw error
      
      // 1. Converte a lista de sugestões do sistema (hardcoded/local)
      // 2. Adiciona as categorias personalizadas do usuário (do DB)
      const finalCategories = [
        ...SYSTEM_CATEGORIES,
        ...(customCategories || [])
      ]
      
      setCategories(finalCategories)
      
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
