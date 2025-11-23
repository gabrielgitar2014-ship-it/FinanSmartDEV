import { create } from 'zustand'
import { addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns'

export const useDateStore = create((set, get) => ({
  currentDate: new Date(),

  // Actions existentes...
  nextMonth: () => set((state) => ({ currentDate: addMonths(state.currentDate, 1) })),
  prevMonth: () => set((state) => ({ currentDate: subMonths(state.currentDate, 1) })),
  goToCurrentMonth: () => set({ currentDate: new Date() }),

  // --- NOVA AÇÃO ---
  setCurrentDate: (date) => set({ currentDate: date }),

  getMonthRange: () => {
    const date = get().currentDate
    return {
      start: startOfMonth(date).toISOString(),
      end: endOfMonth(date).toISOString()
    }
  }
}))
