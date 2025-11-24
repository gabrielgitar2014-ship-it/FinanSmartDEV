import { create } from 'zustand'

export const useSyncStore = create((set) => ({
  // Cada vez que este número mudar, a aplicação inteira sabe que precisa se atualizar
  syncVersion: 0,
  
  // Função que o Realtime vai chamar para "avisar" que houve mudança
  triggerSync: () => set((state) => ({ syncVersion: state.syncVersion + 1 }))
}))