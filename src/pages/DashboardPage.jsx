import { useState, useEffect } from 'react'
// CORREÇÃO AQUI: Adicionei AnimatePresence na importação
import { motion, AnimatePresence } from 'framer-motion' 
import { 
  Eye, EyeOff, ArrowUpCircle, ArrowDownCircle, Wallet, 
  Plus, CreditCard, ChevronRight, Sun, Moon, Search, RefreshCw, TrendingUp, ChevronLeft 
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { useAuth } from '../context/AuthContext'
import { useDashboard } from '../hooks/useDashboard'
import { useThemeStore } from '../store/useThemeStore'
import { useDateStore } from '../store/useDateStore'

import GlobalSearchModal from '../components/GlobalSearchModal'

export default function DashboardPage() {
  const { profile } = useAuth()
  // Apenas lemos a data para exibir no título (Navegação é global agora)
  const { currentDate } = useDateStore() 
  const { data, loading, refetch, error } = useDashboard()
  const { theme, toggleTheme } = useThemeStore()
  
  const [showValues, setShowValues] = useState(true)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

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

  const renderValue = (value, type = 'default') => {
    if (loading) {
      return <div className={`h-6 bg-white/20 rounded animate-pulse ${type === 'header' ? 'w-32' : 'w-20'}`} />
    }
    if (!showValues) {
      return <span className="tracking-widest text-lg">••••••</span>
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
  }

  const displayMonth = format(currentDate, 'MMMM', { locale: ptBR })
  const capitalizedMonth = displayMonth.charAt(0).toUpperCase() + displayMonth.slice(1)

  if (error) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center h-[50vh]">
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 max-w-sm">
          <p className="font-bold text-lg mb-2">Erro de conexão</p>
          <p className="text-sm mb-4 opacity-80">{error}</p>
          <button onClick={refetch} className="w-full bg-red-100 dark:bg-red-800 px-4 py-3 rounded-xl text-sm font-bold hover:brightness-95 transition-all">
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-32 lg:pb-0 space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex items-center justify-between px-1 py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-sm shadow-md border-2 border-white dark:border-slate-800 uppercase">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Olá,</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{profile?.full_name?.split(' ')[0]}</p>
          </div>
        </div>

        <div className="flex gap-1 sm:gap-2">
          <button onClick={() => setIsSearchOpen(true)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-all" title="Buscar (Ctrl+K)">
            <Search size={20} />
          </button>
          <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-all hidden sm:block">
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button onClick={() => setShowValues(!showValues)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-all">
            {showValues ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
          <button onClick={refetch} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-all">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* CARD SALDO */}
      <div className="relative w-full h-48 bg-slate-900 dark:bg-black rounded-[2rem] p-6 text-white shadow-2xl shadow-slate-900/20 dark:shadow-black/50 overflow-hidden flex flex-col justify-between transition-all hover:scale-[1.01] duration-500">
        <div className="absolute top-[-50%] right-[-20%] w-80 h-80 bg-indigo-600/30 rounded-full blur-[80px] animate-pulse"></div>
        <div className="absolute bottom-[-50%] left-[-20%] w-80 h-80 bg-blue-600/20 rounded-full blur-[80px] animate-pulse delay-1000"></div>
        
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-2">Saldo Geral <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[9px] text-slate-300">BR</span></p>
            <div className="text-3xl font-bold tracking-tight font-mono min-h-[40px] flex items-center">{renderValue(data.totalBalance, 'header')}</div>
          </div>
          <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner"><Wallet className="text-white/90" size={24} /></div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-3">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5 backdrop-blur-md hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase tracking-wide mb-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div> Receitas</div>
            <div className="font-semibold text-sm font-mono text-white/90">{renderValue(data.monthIncome)}</div>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5 backdrop-blur-md hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-bold uppercase tracking-wide mb-1"><div className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]"></div> Despesas</div>
            <div className="font-semibold text-sm font-mono text-white/90">{renderValue(data.monthExpense)}</div>
          </div>
        </div>
      </div>

      {/* AÇÕES */}
      <div className="flex justify-between px-2 sm:px-4">
        {[
          { icon: Plus, label: 'Nova', color: 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700' },
          { icon: ArrowUpCircle, label: 'Receita', color: 'bg-white dark:bg-slate-800 text-emerald-600 border border-slate-100 dark:border-slate-700 hover:border-emerald-200' },
          { icon: ArrowDownCircle, label: 'Despesa', color: 'bg-white dark:bg-slate-800 text-red-600 border border-slate-100 dark:border-slate-700 hover:border-red-200' },
          { icon: CreditCard, label: 'Cartões', color: 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700 hover:border-indigo-200' },
        ].map((item, idx) => (
          <button key={idx} className="flex flex-col items-center gap-2 group active:scale-95 transition-all" onClick={() => console.log(item.label)}>
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[1.2rem] flex items-center justify-center text-xl sm:text-2xl transition-all duration-300 ${item.color}`}><item.icon size={24} strokeWidth={2} /></div>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{item.label}</span>
          </button>
        ))}
      </div>

      {/* EXTRATO */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">Extrato <span className="text-xs font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{capitalizedMonth}</span></h3>
          <button className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1">Ver tudo <ChevronRight size={14} /></button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => (<div key={i} className="bg-white dark:bg-slate-900 h-20 rounded-3xl border border-slate-100 dark:border-slate-800 animate-pulse flex items-center px-4 gap-4"><div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl" /><div className="flex-1 space-y-2"><div className="w-32 h-4 bg-slate-200 dark:bg-slate-800 rounded" /><div className="w-20 h-3 bg-slate-200 dark:bg-slate-800 rounded" /></div></div>))}</div>
        ) : data.recentTransactions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-600"><TrendingUp size={32} /></div>
            <p className="text-slate-900 dark:text-white font-medium">Sem movimentações</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Suas transações de {displayMonth.toLowerCase()} aparecerão aqui.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            {data.recentTransactions.map((item, index) => (
              <div key={item.id} className={`flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group ${index !== data.recentTransactions.length - 1 ? 'border-b border-slate-50 dark:border-slate-800' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xl border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform duration-300">{item.icon && item.icon.length < 5 ? item.icon : (item.type === 'income' ? '💰' : '💸')}</div>
                  <div><p className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{item.label}</p><p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{item.category}</p></div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold font-mono ${item.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-200'}`}>{showValues ? <>{item.type === 'income' ? '+' : ''} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(item.amount))}</> : '••••••'}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{item.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. GLOBAL SEARCH MODAL */}
      <AnimatePresence>
        {isSearchOpen && <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
      </AnimatePresence>

    </div>
  )
}