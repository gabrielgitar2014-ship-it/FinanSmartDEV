import { useState, useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { 
  ChevronLeft, ChevronRight, Search, Sun, Moon, Eye, EyeOff 
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Hooks e Stores
import Sidebar from './Sidebar'
import MobileFooter from './MobileFooter'
import { useAuth } from '../context/AuthContext'
import { useThemeStore } from '../store/useThemeStore'
import { useDateStore } from '../store/useDateStore'
import { useUIStore } from '../store/useUIStore'
import GlobalSearchModal from '../components/GlobalSearchModal'

export default function AppLayout() {
  const { profile } = useAuth()
  const { theme, toggleTheme } = useThemeStore()
  const { showValues, toggleValues } = useUIStore()
  
  // Store de Data (Navegação)
  const { currentDate, nextMonth, prevMonth, setCurrentDate } = useDateStore()
  
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const dateInputRef = useRef(null) // Referência para o input

  // Formatação
  const displayMonth = format(currentDate, 'MMMM', { locale: ptBR })
  const capitalizedMonth = displayMonth.charAt(0).toUpperCase() + displayMonth.slice(1)
  const displayYear = format(currentDate, 'yyyy')
  
  // Valor para o input nativo (Formato YYYY-MM-DD para type="date")
  // Usamos o dia 01 para garantir validade
  const inputValue = format(currentDate, 'yyyy-MM-01')

  // --- LÓGICA DO CALENDÁRIO NATIVO ---
  const handleNativeDateChange = (e) => {
    if (!e.target.value) return
    
    // O input date retorna "2025-06-15"
    // Como só queremos o mês, pegamos as duas primeiras partes
    const [year, month] = e.target.value.split('-')
    
    // Criamos a data (Mês em JS é 0-indexado)
    const newDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    
    setCurrentDate(newDate)
  }

  // Função para forçar a abertura do calendário nativo
  const openDatePicker = () => {
    try {
      // Tenta a API moderna (Chrome 99+, Safari 16+, Android)
      if (dateInputRef.current && dateInputRef.current.showPicker) {
        dateInputRef.current.showPicker()
      } else {
        // Fallback clássico
        dateInputRef.current.click()
      }
    } catch (err) {
      console.error("Erro ao abrir picker:", err)
    }
  }

  // Atalho de Teclado (Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    // Container Principal: Ocupa 100% da tela e organiza em linha (Sidebar | Conteúdo)
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">
      
      {/* 1. Sidebar (Desktop) - O componente Sidebar já deve ter a classe 'hidden lg:flex' */}
      <Sidebar />

      {/* 2. Área Principal (Conteúdo + Header) */}
      <main className="flex-1 flex flex-col h-full relative min-w-0">
        
        {/* === HEADER GLOBAL === */}
        <header className="px-4 py-3 flex items-center justify-between bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm z-20 border-b border-slate-100 dark:border-slate-800/50 lg:border-none relative shrink-0">
          
          {/* ESQUERDA: Perfil */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-md border-2 border-white dark:border-slate-800 uppercase overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                profile?.full_name?.charAt(0) || 'U'
              )}
            </div>
            <div className="hidden sm:block">
               <p className="text-[10px] font-bold text-slate-400 uppercase">Olá,</p>
               <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{profile?.full_name?.split(' ')[0]}</p>
            </div>
          </div>

          {/* CENTRO: Seletor de Mês + Input Invisível */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full shadow-sm border border-slate-200 dark:border-slate-800 z-30">
            
            <button onClick={prevMonth} className="p-1 text-slate-400 hover:text-indigo-600 rounded-full active:scale-95 z-40">
              <ChevronLeft size={16} />
            </button>
            
            {/* Área Clicável do Mês */}
            <div 
              className="flex flex-col items-center leading-none min-w-[80px] relative cursor-pointer select-none group"
              onClick={openDatePicker} // Clique no texto abre o picker
            >
              <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                {capitalizedMonth}
              </span>
              <span className="text-[9px] font-semibold text-slate-400 pointer-events-none">
                {displayYear}
              </span>
              
              {/* Input Invisível (Mas presente no DOM) */}
              <input 
                ref={dateInputRef}
                type="date"
                value={inputValue}
                onChange={handleNativeDateChange}
                className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>

            <button onClick={nextMonth} className="p-1 text-slate-400 hover:text-indigo-600 rounded-full active:scale-95 z-40">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* DIREITA: Ações */}
          <div className="flex gap-1">
            <button onClick={() => setIsSearchOpen(true)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-white dark:hover:bg-slate-800 transition-all" title="Buscar (Ctrl+K)">
              <Search size={20} />
            </button>
            <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-white dark:hover:bg-slate-800 transition-all hidden sm:block">
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button onClick={toggleValues} className="p-2 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-white dark:hover:bg-slate-800 transition-all">
              {showValues ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>
        </header>

        {/* Conteúdo das Páginas (Scrollável) */}
        <div className="flex-1 overflow-y-auto scroll-smooth p-4 md:p-8 pb-32 lg:pb-8 w-full max-w-7xl mx-auto z-10">
          <Outlet />
        </div>
      </main>

      {/* Menu Mobile (Apenas Mobile) */}
      <MobileFooter />
      
      {/* Modal de Busca Global */}
      {isSearchOpen && <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
    </div>
  )
}
