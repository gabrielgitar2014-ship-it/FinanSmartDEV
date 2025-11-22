import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useAccountDetails(accountId) {
  const [account, setAccount] = useState(null)
  const [creditCards, setCreditCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAccountDetails = useCallback(async () => {
    if (!accountId) return

    try {
      setLoading(true)
      setError(null)

      // 1. Buscar dados da conta
      const { data: accData, error: accError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single()

      if (accError) throw accError
      setAccount(accData)

      // 2. Buscar cartões vinculados
      const { data: cardsData, error: cardsError } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })

      if (cardsError) throw cardsError
      setCreditCards(cardsData || [])

    } catch (err) {
      console.error('Erro ao carregar detalhes:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    fetchAccountDetails()
  }, [fetchAccountDetails])

  // --- NOVA FUNÇÃO: CRIAR CARTÃO ---
  const createCard = async (cardData) => {
    try {
      const { error } = await supabase.from('credit_cards').insert({
        account_id: accountId,
        ...cardData
      })
      if (error) throw error
      await fetchAccountDetails() // Recarrega a lista
      return { success: true }
    } catch (err) {
      console.error(err)
      return { success: false, error: err.message }
    }
  }

  // --- NOVA FUNÇÃO: DELETAR CARTÃO ---
  const deleteCard = async (cardId) => {
    try {
      const { error } = await supabase.from('credit_cards').delete().eq('id', cardId)
      if (error) throw error
      await fetchAccountDetails()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  return { 
    account, 
    creditCards, 
    loading, 
    error, 
    refetch: fetchAccountDetails,
    createCard,  // <--- Exportando
    deleteCard   // <--- Exportando
  }
}