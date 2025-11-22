import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Filter, Plus, ShoppingBag, Coffee, Car, DollarSign, Home, 
  Smartphone, ChevronDown, Settings, X, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react'
import { toast } from 'sonner'

import { useTransactions } from '../hooks/useTransactions'
import { useAccounts } from '../hooks/useAccounts' // Para o hook de categorias usar household_id
import { useCategories } from '../hooks/useCategories'
import AddTransactionModal from '../components/AddTransactionModal' // O Modal que construímos

export default function TransactionsPage() {
  const { groupedTransactions, loading, error, refetch, formatDateHeader } = useTransactions()
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Helper de Formatação (Padrão para ser usado nos valores)
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  // Helper para mapear ícones (Baseado no seu Seed SQL)
  const getCategoryIcon = (categoryName) => {
    const name = categoryName?.toLowerCase() || ''
    if (name.includes('alimentação') || name.includes('lanch')) return <ShoppingBag size={20} />
    if (name.includes('moradia') || name.includes('casa')) return <Home size={20} />
    if (name.includes('transporte') || name.includes('uber')) return <Car size={20} />
    if (name.includes('saúde') || name.includes('lazer')) return <Activity size={20} />
    if (name.includes('salário') || name.includes('renda')) return <DollarSign size={20} />
    return <Tag size={20} />
  }

  const handleTransactionSuccess = () => {
    // Fecha o modal e força o dashboard (e esta lista) a buscar os dados novos
    refetch() 
    useDashboard().refetch() // Força o refresh dos saldos globais
    setIsModalOpen(false)
  }

  if (error) return <div className="p-8 text-center text-red-500">Erro ao carregar extrato.</div>

  return (
    <div className="pb-28 lg:pb-0 relative min-h-screen">
      
      {/* --- HEADER FIXO (Busca e Título) --- */}
      <div className="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm z-30 px-4 pt-4 pb-2 space-y-4 border-b border-slate-100 dark:border-slate-800 lg:border-b-0">
        
        {/* Linha 1: Título e Busca */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Extrato Completo</h1>
          <button className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm text-slate-500 hover:text-indigo-600 transition-colors">
            <Search size={20} />
          </button>
        </div>

        {/* Linha 2: Filtros e Gerenciamento */}
        <div className="flex justify-between items-center">
            
            {/* Chips de Filtro */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {['Data', 'Categoria', 'Conta'].map((filter) => (
                    <button 
                    key={filter}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap shadow-sm active:scale-95 transition-transform"
                    >
                        {filter} <ChevronDown size={14} />
                    </button>
                ))}
            </div>

            {/* Link para Gerenciar Categorias */}
            <Link 
                to="/transactions/categories"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 transition-colors shrink-0"
            >
                <Settings size={14} /> Gerenciar
            </Link>
        </div>
        
      </div>

      {/* --- LISTA DE TRANSAÇÕES (AGRUPADA) --- */}
      <div className="px-4 space-y-6 mt-4">
        
        {loading ? (
          // Skeleton Loading
          [1, 2, 3].map(i => (
            <div key={i} className="space-y-3">
              <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-20 bg-white dark:bg-slate-900 rounded-3xl shadow-sm animate-pulse" />
            </div>
          ))
        ) : Object.keys(groupedTransactions).length === 0 ? (
          // Empty State
          <div className="text-center py-20 text-slate-400">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={32} />
            </div>
            <p className="dark:text-slate-400">Nenhuma transação encontrada no mês atual.</p>
          </div>
        ) : (
          // Renderização dos Grupos
          Object.entries(groupedTransactions).map(([dateKey, transactions]) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              key={dateKey}
            >
              {/* Header da Data (Ex: Hoje, 12 de Setembro) */}
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 ml-1 uppercase tracking-wide">
                {formatDateHeader(dateKey)}
              </h3>

              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
                {transactions.map((item, index) => (
                  <div 
                    key={item.id} 
                    className={`flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                      index !== transactions.length - 1 ? 'border-b border-slate-100 dark:border-slate-800/70' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Ícone */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-inner ${
                        item.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        {getCategoryIcon(item.category)}
                      </div>
                      
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{item.description}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.category}</p>
                      </div>
                    </div>

                    <span className={`text-sm font-bold whitespace-nowrap font-mono ${
                      item.type === 'income' ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {item.type === 'expense' ? '- ' : '+'}
                      {formatCurrency(Math.abs(item.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* --- FAB (Floating Action Button) --- */}
      <button 
        className="fixed bottom-24 lg:bottom-10 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl shadow-indigo-600/30 flex items-center justify-center transition-transform hover:scale-110 active:scale-90 z-40"
        onClick={() => setIsModalOpen(true)}
      >
        <Plus size={28} />
      </button>
      
      {/* --- MODAL DE TRANSAÇÃO --- */}
      <AnimatePresence>
        {isModalOpen && (
          <AddTransactionModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={handleTransactionSuccess} 
          />
        )}
      </AnimatePresence>

    </div>
  )
}
