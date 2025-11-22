import { create } from 'zustand'

export const useTransactionStore = create((set, get) => ({
  // Cache de transações indexado por mês (Ex: '2025-11': [...])
  transactionsCache: {},
  
  // Métricas globais (Saldo e Cartões)
  totalBalance: 0,
  creditCardLimit: 0,

  // Actions
  setTransactionsForMonth: (monthKey, data) => set((state) => ({
    transactionsCache: { ...state.transactionsCache, [monthKey]: data }
  })),

  setGlobalMetrics: (balance, limit) => set({ 
    totalBalance: balance, 
    creditCardLimit: limit 
  }),

  // Helper para pegar dados (se existirem)
  getTransactionsForMonth: (monthKey) => get().transactionsCache[monthKey] || null,
  
  // Limpar tudo (logout)
  clearCache: () => set({ transactionsCache: {}, totalBalance: 0, creditCardLimit: 0 })
}))