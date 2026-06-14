export const CURRENCIES = [
  { code: 'BRL', name: 'Real Brasileiro', symbol: 'R$', type: 'fiat', locale: 'pt-BR' },
  { code: 'USD', name: 'Dólar Americano', symbol: 'US$', type: 'fiat', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', symbol: '€', type: 'fiat', locale: 'de-DE' },
  { code: 'GBP', name: 'Libra Esterlina', symbol: '£', type: 'fiat', locale: 'en-GB' },
  { code: 'JPY', name: 'Iene Japonês', symbol: '¥', type: 'fiat', locale: 'ja-JP' },
  { code: 'BTC', name: 'Bitcoin', symbol: '₿', type: 'crypto', locale: 'en-US' },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', type: 'crypto', locale: 'en-US' },
  { code: 'USDT', name: 'Tether (Dólar)', symbol: '₮', type: 'crypto', locale: 'en-US' },
]

export const getCurrencyConfig = (code) => {
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0]
}