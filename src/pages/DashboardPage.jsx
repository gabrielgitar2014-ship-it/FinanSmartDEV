import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowUpCircle, ArrowDownCircle, Wallet, 
  Plus, CreditCard, ChevronRight, TrendingUp 
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { useAuth } from '../context/AuthContext'
import { useDashboard } from '../hooks/useDashboard'
import { useThemeStore } from '../store/useThemeStore'
import { useDateStore } from '../store/useDateStore'
import { useUIStore } from '../store/useUIStore'

import GlobalSearchModal from '../components/GlobalSearchModal'
// NOVOS MODAIS (CORREÇÃO AQUI)
import AddExpenseModal from '../components/AddExpenseModal'
import AddIncomeModal from '../components/AddIncomeModal'

export default function DashboardPage() {
  const { profile } = useAuth()
  // Apenas lemos a data para exibir nos textos
  const { currentDate } = useDateStore()
  const { data, loading, refetch, error } = useDashboard()
  const { showValues } = useUIStore()
  
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  
  // ESTADOS DOS MODAIS
  const [isExpenseOpen, setIsExpenseOpen] = useState(false)
  const [isIncomeOpen, setIsIncomeOpen] = useState(false)

  // Atalho Ctrl + K
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

  const handleSuccess = () => {
    refetch()
    setIsExpenseOpen(false)
    setIsIncomeOpen(false)
  }

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
    <div className="pb-32 lg:pb-0 space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500 pt-4">
      
      {/* HEADER REMOVIDO (Está no AppLayout) */}

      {/* CARD PRINCIPAL (SALDO + INVESTIMENTO) */}
      <div className="relative w-full bg-slate-900 dark:bg-black rounded-[2rem] p-6 text-white shadow-2xl shadow-slate-900/20 dark:shadow-black/50 overflow-hidden flex flex-col justify-between transition-all hover:scale-[1.01] duration-500">
        {/* Efeitos */}
        <div className="absolute top-[-50%] right-[-20%] w-80 h-80 bg-indigo-600/30 rounded-full blur-[80px] animate-pulse"></div>
        <div className="absolute bottom-[-50%] left-[-20%] w-80 h-80 bg-blue-600/20 rounded-full blur-[80px] animate-pulse delay-1000"></div>
        
        <div className="relative z-10 flex flex-col gap-6">
          
          {/* Linha 1: Saldo Geral (Caixa) */}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-2">
                Saldo Disponível
              </p>
              <div className="text-3xl font-bold tracking-tight font-mono min-h-[40px] flex items-center">
                {renderValue(data.totalBalance, 'header')}
              </div>
            </div>
            <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
               <Wallet className="text-white/90" size={24} />
            </div>
          </div>

          {/* Linha 2: Investimentos (Separado) */}
          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 backdrop-blur-md">
             <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                <TrendingUp size={18} />
             </div>
             <div>
                <p className="text-[10px] font-bold uppercase text-emerald-400 tracking-wide">Investimentos</p>
                <p className="text-lg font-mono font-bold text-white leading-none mt-0.5">
                   {renderValue(data.totalInvested)}
                </p>
             </div>
          </div>

        </div>

        {/* Rodapé: Resumo Mês */}
        <div className="relative z-10 grid grid-cols-2 gap-3 mt-6 border-t border-white/10 pt-4">
          <div>
             <p className="text-[10px] text-emerald-400 font-bold uppercase mb-0.5">Receitas</p>
             <p className="text-sm font-mono text-white/90">{renderValue(data.monthIncome)}</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] text-red-400 font-bold uppercase mb-0.5">Despesas</p>
             <p className="text-sm font-mono text-white/90">{renderValue(data.monthExpense)}</p>
          </div>
        </div>
      </div>

      {/* AÇÕES RÁPIDAS */}
      <div className="flex justify-between px-2 sm:px-4">
        {[
          { 
            icon: ArrowUpCircle, label: 'Nova Receita', 
            color: 'bg-white dark:bg-slate-800 text-emerald-600 border border-slate-100 dark:border-slate-700 hover:border-emerald-200',
            action: () => setIsIncomeOpen(true) 
          },
          { 
            icon: ArrowDownCircle, label: 'Nova Despesa', 
            color: 'bg-white dark:bg-slate-800 text-red-600 border border-slate-100 dark:border-slate-700 hover:border-red-200',
            action: () => setIsExpenseOpen(true)
          },
          { 
            icon: Plus, 
            label: 'Nova Conta', 
            color: 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700', 
            action: () => window.location.href = '/accounts/new'
          },
        ].map((item, idx) => (
          <button 
            key={idx} 
            className="flex flex-col items-center gap-2 group active:scale-95 transition-all"
            onClick={item.action}
          >
            <div className={`w-full h-16 rounded-[1.2rem] flex items-center justify-center text-2xl transition-all duration-300 shadow-sm ${item.color}`}>
              <item.icon size={28} strokeWidth={2} />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* EXTRATO */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
            Extrato <span className="text-xs font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{capitalizedMonth}</span>
          </h3>
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

      {/* MODAIS */}
      <AnimatePresence>
        {isSearchOpen && <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
        
        {isExpenseOpen && (
          <AddExpenseModal isOpen={isExpenseOpen} onClose={() => setIsExpenseOpen(false)} onSuccess={handleSuccess} />
        )}
        
        {isIncomeOpen && (
          <AddIncomeModal isOpen={isIncomeOpen} onClose={() => setIsIncomeOpen(false)} onSuccess={handleSuccess} />
        )}
      </AnimatePresence>

      {/* FAB (Abre Despesa por Padrão) */}
      <button 
        className="fixed bottom-24 lg:bottom-10 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl shadow-indigo-600/30 flex items-center justify-center transition-transform hover:scale-110 active:scale-90 z-40"
        onClick={() => setIsExpenseOpen(true)}
      >
        <Plus size={28} />
      </button>

    </div>
  )
}