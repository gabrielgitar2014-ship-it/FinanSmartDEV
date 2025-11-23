import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUIStore = create(
  persist(
    (set) => ({
      showValues: true,
      toggleValues: () => set((state) => ({ showValues: !state.showValues })),
    }),
    { name: 'finansmart-ui' }
  )
)
