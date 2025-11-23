import { useState, useEffect } from 'react'

// LISTA EXPANDIDA DE MOEDAS (FIAT + CRYPTO)
export const AVAILABLE_CURRENCIES = [
  // AMÉRICAS
  { code: 'BRL', name: 'Real Brasileiro', symbol: 'R$', type: 'fiat', flag: '🇧🇷' },
  { code: 'USD', name: 'Dólar Americano', symbol: '$', type: 'fiat', flag: '🇺🇸' },
  { code: 'CAD', name: 'Dólar Canadense', symbol: 'C$', type: 'fiat', flag: '🇨🇦' },
  { code: 'ARS', name: 'Peso Argentino', symbol: '$', type: 'fiat', flag: '🇦🇷' },
  
  // EUROPA
  { code: 'EUR', name: 'Euro', symbol: '€', type: 'fiat', flag: '🇪🇺' },
  { code: 'GBP', name: 'Libra Esterlina', symbol: '£', type: 'fiat', flag: '🇬🇧' },
  { code: 'CHF', name: 'Franco Suíço', symbol: 'Fr', type: 'fiat', flag: '🇨🇭' },

  // ÁSIA/OCEANIA
  { code: 'JPY', name: 'Iene Japonês', symbol: '¥', type: 'fiat', flag: '🇯🇵' },
  { code: 'CNY', name: 'Yuan Chinês', symbol: '¥', type: 'fiat', flag: '🇨🇳' },
  { code: 'AUD', name: 'Dólar Australiano', symbol: 'A$', type: 'fiat', flag: '🇦🇺' },

  // CRIPTO
  { code: 'BTC', name: 'Bitcoin', symbol: '₿', type: 'crypto', icon: 'bitcoin' },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', type: 'crypto', icon: 'ethereum' },
  { code: 'USDT', name: 'Tether', symbol: '₮', type: 'crypto', icon: 'dollar' },
  { code: 'SOL', name: 'Solana', symbol: '◎', type: 'crypto', icon: 'solana' },
]

export function useCurrencies(userCurrencies = ['BRL']) {
  const [rates, setRates] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRates = async () => {
      const foreignCurrencies = userCurrencies.filter(c => c !== 'BRL')
      
      if (foreignCurrencies.length === 0) {
        setLoading(false)
        return
      }

      try {
        // Busca cotações (AwesomeAPI suporta crypto e fiat)
        const codes = foreignCurrencies.map(c => `${c}-BRL`).join(',')
        const response = await fetch(`https://economia.awesomeapi.com.br/last/${codes}`)
        const data = await response.json()
        
        const newRates = {}
        Object.keys(data).forEach(key => {
          const code = key.split('BRL')[0]
          newRates[code] = parseFloat(data[key].bid)
        })
        
        setRates(newRates)
      } catch (err) {
        console.error('Erro ao buscar cotações:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRates()
  }, [userCurrencies])

  return { 
    rates, 
    loading,
    availableCurrencies: AVAILABLE_CURRENCIES 
  }
}