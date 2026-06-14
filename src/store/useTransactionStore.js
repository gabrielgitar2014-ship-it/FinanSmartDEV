import { create } from 'zustand'

export const useTransactionStore = create((set, get) => ({
  // Cache de transações indexado por mês (Ex: '2025-11': [...])
  transactionsCache: {},
  
  // NOVO: Controle de quais meses já foram buscados (Ex: '2025-11': true)
  fetchedMonths: {},
  
  // Métricas globais
  totalBalance: 0,
  creditCardLimit: 0,

  // Actions
  setTransactionsForMonth: (monthKey, data) => set((state) => ({
    transactionsCache: { ...state.transactionsCache, [monthKey]: data },
    // Marca este mês como "Carregado com sucesso", mesmo que venha vazio
    fetchedMonths: { ...state.fetchedMonths, [monthKey]: true }
  })),

  setGlobalMetrics: (balance, limit) => set({ 
    totalBalance: balance, 
    creditCardLimit: limit 
  }),

  getTransactionsForMonth: (monthKey) => get().transactionsCache[monthKey] || null,
  
  clearCache: () => set({ transactionsCache: {}, fetchedMonths: {}, totalBalance: 0, creditCardLimit: 0 })
}))
