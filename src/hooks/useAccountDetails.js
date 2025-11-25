// src/hooks/useAccountDetails.js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useAccountDetails(accountId) {
  const [account, setAccount] = useState(null)
  const [creditCards, setCreditCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAccountDetails = useCallback(async () => {
    // 🔥 Fluxo de "nova conta": não tentar buscar no banco
    if (!accountId || accountId === 'new') {
      setAccount(null)
      setCreditCards([])
      setError(null)
      setLoading(false)
      return
    }

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

      // 2. Buscar cartões vinculados (com ordenação)
      const { data: cardsData, error: cardsError } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })

      if (cardsError) throw cardsError
      setCreditCards(cardsData || [])

    } catch (err) {
      console.error('[useAccountDetails] Erro ao carregar:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    fetchAccountDetails()
  }, [fetchAccountDetails])

  // --- FUNÇÃO: CRIAR CARTÃO ---
  const createCard = async (cardData) => {
    try {
      if (!accountId || accountId === 'new') {
        throw new Error('Não é possível criar cartão para uma conta não salva.')
      }

      // Validação básica
      if (!cardData.name || !cardData.limit_amount) {
        throw new Error('Nome e limite são obrigatórios')
      }

      const { error } = await supabase.from('credit_cards').insert({
        account_id: accountId,
        name: cardData.name,
        limit_amount: Number(cardData.limit_amount),
        available_limit: Number(cardData.limit_amount), // Inicia com limite total
        closing_day: Number(cardData.closing_day) || 1,
        due_day: Number(cardData.due_day) || 10,
        last_4_digits: cardData.last_4_digits || '****'
      })

      if (error) throw error

      await fetchAccountDetails() // Recarrega a lista
      return { success: true }
    } catch (err) {
      console.error('[createCard] Erro:', err)
      return { success: false, error: err.message }
    }
  }

  // --- FUNÇÃO: DELETAR CARTÃO ---
  const deleteCard = async (cardId) => {
    try {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id')
        .eq('credit_card_id', cardId)
        .limit(1)

      if (transactions && transactions.length > 0) {
        return {
          success: false,
          error: 'Não é possível excluir cartão com transações. Exclua as transações primeiro.'
        }
      }

      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', cardId)

      if (error) throw error

      await fetchAccountDetails()
      return { success: true }
    } catch (err) {
      console.error('[deleteCard] Erro:', err)
      return { success: false, error: err.message }
    }
  }

  return {
    account,
    creditCards,
    loading,
    error,
    refetch: fetchAccountDetails,
    createCard,
    deleteCard
  }
}
