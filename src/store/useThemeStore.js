import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'light', // Valor inicial padrão
      
      // Ação de alternar
      toggleTheme: () => {
        const currentTheme = get().theme
        const newTheme = currentTheme === 'light' ? 'dark' : 'light'
        
        // Aplica a classe no HTML imediatamente
        applyThemeToDom(newTheme)
        
        set({ theme: newTheme })
      },

      // Ação de inicialização (chamada ao abrir o app)
      initTheme: () => {
        const savedTheme = get().theme
        applyThemeToDom(savedTheme)
      }
    }),
    {
      name: 'finansmart-theme', // Nome da chave no LocalStorage
    }
  )
)

// Helper para manipular o DOM (Tailwind precisa da classe 'dark' no html)
function applyThemeToDom(theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
    root.style.colorScheme = 'dark' // Ajuda scrollbars e inputs nativos
  } else {
    root.classList.remove('dark')
    root.style.colorScheme = 'light'
  }
}