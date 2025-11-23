import { useState, useEffect } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { 
  ChevronLeft, ChevronRight, Search, Sun, Moon, Eye, EyeOff, RefreshCw 
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Hooks e Stores
import Sidebar from './Sidebar'
import MobileFooter from './MobileFooter'
import { useAuth } from '../context/AuthContext'
import { useThemeStore } from '../store/useThemeStore'
import { useDateStore } from '../store/useDateStore'
import { useUIStore } from '../store/useUIStore' // <--- Nova Store
import GlobalSearchModal from '../components/GlobalSearchModal'

export default function AppLayout() {
  const { profile } = useAuth()
  const { theme, toggleTheme } = useThemeStore()
  const { showValues, toggleValues } = useUIStore()
  const { currentDate, nextMonth, prevMonth, setCurrentDate } = useDateStore()
  
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Formatação da Data
  const displayMonth = format(currentDate, 'MMMM', { locale: ptBR })
  const capitalizedMonth = displayMonth.charAt(0).toUpperCase() + displayMonth.slice(1)
  const displayYear = format(currentDate, 'yyyy')
  const inputValue = format(currentDate, 'yyyy-MM') // Valor para o input nativo

  // Handler do Input Fantasma
  const handleNativeDateChange = (e) => {
    if (!e.target.value) return
    const [year, month] = e.target.value.split('-')
    const newDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    setCurrentDate(newDate)
  }

  // Atalho Ctrl+K
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
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">
      
      {/* Sidebar (Desktop) */}
      <Sidebar />

      {/* Área Principal */}
      <main className="flex-1 flex flex-col h-full relative min-w-0">
        
        {/* === HEADER GLOBAL === */}
        <header className="px-4 py-3 flex items-center justify-between bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-sm z-20 border-b border-slate-100 dark:border-slate-800/50 lg:border-none">
          
          {/* ESQUERDA: Perfil */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-md border-2 border-white dark:border-slate-800 uppercase">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block">
               <p className="text-[10px] font-bold text-slate-400 uppercase">Olá,</p>
               <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{profile?.full_name?.split(' ')[0]}</p>
            </div>
          </div>

          {/* CENTRO: Seletor de Mês + Input Fantasma */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full shadow-sm border border-slate-200 dark:border-slate-800">
            <button onClick={prevMonth} className="p-1 text-slate-400 hover:text-indigo-600 rounded-full active:scale-95"><ChevronLeft size={16} /></button>
            
            <div className="flex flex-col items-center leading-none min-w-[80px] relative cursor-pointer">
              <span className="text-sm font-bold text-slate-900 dark:text-white">{capitalizedMonth}</span>
              <span className="text-[9px] font-semibold text-slate-400">{displayYear}</span>
              
              {/* O INPUT FANTASMA */}
              <input 
                type="month"
                value={inputValue}
                onChange={handleNativeDateChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
            </div>

            <button onClick={nextMonth} className="p-1 text-slate-400 hover:text-indigo-600 rounded-full active:scale-95"><ChevronRight size={16} /></button>
          </div>

          {/* DIREITA: Ações */}
          <div className="flex gap-1">
            <button onClick={() => setIsSearchOpen(true)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-white dark:hover:bg-slate-800 transition-all"><Search size={20} /></button>
            <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-white dark:hover:bg-slate-800 transition-all hidden sm:block">{theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}</button>
            <button onClick={toggleValues} className="p-2 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-white dark:hover:bg-slate-800 transition-all">{showValues ? <Eye size={20} /> : <EyeOff size={20} />}</button>
          </div>
        </header>

        {/* Conteúdo das Páginas */}
        <div className="flex-1 overflow-y-auto scroll-smooth p-4 md:p-8 pb-32 lg:pb-8 w-full max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      <MobileFooter />
      
      {/* Modal de Busca Global */}
      {isSearchOpen && <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
    </div>
  )
}
