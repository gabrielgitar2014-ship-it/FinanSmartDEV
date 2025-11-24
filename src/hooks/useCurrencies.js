import { useState, useEffect } from 'react'

// LISTA EXPANDIDA DE MOEDAS (FIAT + CRYPTO)
export const AVAILABLE_CURRENCIES = [
  // AMÉRICAS
  { code: 'BRL', name: 'Real Brasileiro', symbol: 'R$', type: 'fiat', flag: '🇧🇷', locale: 'pt-BR' },
  { code: 'USD', name: 'Dólar Americano', symbol: '$', type: 'fiat', flag: '🇺🇸', locale: 'en-US' },
  { code: 'CAD', name: 'Dólar Canadense', symbol: 'C$', type: 'fiat', flag: '🇨🇦', locale: 'en-CA' },
  { code: 'ARS', name: 'Peso Argentino', symbol: '$', type: 'fiat', flag: '🇦🇷', locale: 'es-AR' },
  
  // EUROPA
  { code: 'EUR', name: 'Euro', symbol: '€', type: 'fiat', flag: '🇪🇺', locale: 'de-DE' },
  { code: 'GBP', name: 'Libra Esterlina', symbol: '£', type: 'fiat', flag: '🇬🇧', locale: 'en-GB' },
  { code: 'CHF', name: 'Franco Suíço', symbol: 'Fr', type: 'fiat', flag: '🇨🇭', locale: 'de-CH' },

  // ÁSIA/OCEANIA
  { code: 'JPY', name: 'Iene Japonês', symbol: '¥', type: 'fiat', flag: '🇯🇵', locale: 'ja-JP' },
  { code: 'CNY', name: 'Yuan Chinês', symbol: '¥', type: 'fiat', flag: '🇨🇳', locale: 'zh-CN' },
  { code: 'AUD', name: 'Dólar Australiano', symbol: 'A$', type: 'fiat', flag: '🇦🇺', locale: 'en-AU' },

  // CRIPTO (Suportadas pela AwesomeAPI)
  { code: 'BTC', name: 'Bitcoin', symbol: '₿', type: 'crypto', icon: '🪙', locale: 'en-US' },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', type: 'crypto', icon: '💎', locale: 'en-US' },
  { code: 'USDT', name: 'Tether', symbol: '₮', type: 'crypto', icon: '💵', locale: 'en-US' },
  { code: 'LTC', name: 'Litecoin', symbol: 'Ł', type: 'crypto', icon: '🔷', locale: 'en-US' },
]

export function useCurrencies(userCurrencies = ['BRL']) {
  const [rates, setRates] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchRates = async () => {
      // Se só tem BRL, não precisa buscar cotações
      const foreignCurrencies = userCurrencies.filter(c => c !== 'BRL')
      
      if (foreignCurrencies.length === 0) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Monta a lista de pares (ex: USD-BRL,EUR-BRL,BTC-BRL)
        const codes = foreignCurrencies.map(c => `${c}-BRL`).join(',')
        
        const response = await fetch(`https://economia.awesomeapi.com.br/last/${codes}`)
        
        // Verifica se a resposta foi bem-sucedida
        if (!response.ok) {
          throw new Error(`API retornou status ${response.status}`)
        }
        
        const data = await response.json()
        
        // Valida se recebemos dados
        if (!data || typeof data !== 'object') {
          throw new Error('Resposta da API inválida')
        }
        
        // Processa apenas as moedas que retornaram dados
        const newRates = {}
        
        foreignCurrencies.forEach(code => {
          const key = `${code}BRL`
          
          if (data[key] && data[key].bid) {
            const rateValue = parseFloat(data[key].bid)
            
            if (!isNaN(rateValue) && rateValue > 0) {
              newRates[code] = rateValue
            } else {
              console.warn(`[useCurrencies] Cotação inválida para ${code}:`, data[key].bid)
            }
          } else {
            console.warn(`[useCurrencies] Cotação não encontrada para ${code}`)
          }
        })
        
        setRates(newRates)
      } catch (err) {
        console.error('[useCurrencies] Erro ao buscar cotações:', err)
        setError(err.message)
        // Não quebra a UI, apenas não mostra cotações
        setRates({})
      } finally {
        setLoading(false)
      }
    }

    fetchRates()
    
    // Atualiza cotações a cada 5 minutos (opcional)
    const interval = setInterval(fetchRates, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [userCurrencies])

  return { 
    rates, 
    loading,
    error,
    availableCurrencies: AVAILABLE_CURRENCIES 
  }
}