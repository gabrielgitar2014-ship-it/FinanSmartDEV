import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Search, Filter, Plus, ShoppingBag, Home, Car, DollarSign, 
  ChevronDown, Settings, AlertCircle, Activity, Tag
} from 'lucide-react'
import { toast } from 'sonner'

import { useTransactions } from '../hooks/useTransactions'
import { useUIStore } from '../store/useUIStore' // <--- 1. IMPORTAR STORE UI
import { useCategories } from '../hooks/useCategories' 

export default function TransactionsPage() {
  const { groupedTransactions, loading, error, formatDateHeader } = useTransactions()
  const { showValues } = useUIStore() // <--- 2. USAR ESTADO GLOBAL
  
  // Helper de Formatação com Máscara
  const formatCurrency = (value) => {
    if (!showValues) return '••••••' // <--- 3. APLICAR MÁSCARA
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  // Helper para mapear ícones
  const getCategoryIcon = (categoryName) => {
    const name = categoryName?.toLowerCase() || ''
    if (name.includes('alimentação') || name.includes('mercado')) return <ShoppingBag size={20} />
    if (name.includes('moradia') || name.includes('aluguel')) return <Home size={20} />
    if (name.includes('transporte') || name.includes('car')) return <Car size={20} />
    if (name.includes('saúde')) return <Activity size={20} />
    if (name.includes('salário') || name.includes('receita')) return <DollarSign size={20} />
    return <Tag size={20} />
  }

  if (error) return (
    <div className="p-8 text-center">
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
        <AlertCircle className="inline mr-2" size={16} /> Erro ao carregar extrato: {error}
      </div>
    </div>
  )

  return (
    <div className="pb-28 lg:pb-0 relative min-h-screen">
      
      {/* HEADER FIXO */}
      <div className="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm z-30 px-4 pt-4 pb-2 space-y-4 border-b border-slate-100 dark:border-slate-800 lg:border-b-0">
        
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Extrato Completo</h1>
          <button className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm text-slate-500 hover:text-indigo-600 transition-colors">
            <Search size={20} />
          </button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
            <div className="flex gap-3">
                {['Data', 'Categoria', 'Conta'].map((filter) => (
                    <button 
                    key={filter}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap shadow-sm active:scale-95 transition-transform"
                    >
                        {filter} <ChevronDown size={14} />
                    </button>
                ))}
            </div>

            {/* Link para Categorias */}
            <Link 
                to="/transactions/categories"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 transition-colors shrink-0 whitespace-nowrap"
            >
                <Settings size={14} /> Categorias
            </Link>
        </div>
        
      </div>

      {/* LISTA DE TRANSAÇÕES */}
      <div className="px-4 space-y-6 mt-4">
        
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="space-y-3">
              <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-20 bg-white dark:bg-slate-900 rounded-3xl shadow-sm animate-pulse" />
            </div>
          ))
        ) : Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={32} />
            </div>
            <p className="dark:text-slate-400">Nenhuma transação encontrada no mês atual.</p>
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([dateKey, transactions]) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              key={dateKey}
            >
              {/* Header da Data */}
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

      {/* FAB */}
      <button 
        className="fixed bottom-24 lg:bottom-10 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl shadow-indigo-600/30 flex items-center justify-center transition-transform hover:scale-110 active:scale-90 z-40"
        onClick={() => toast.info('Módulo de Adicionar Transação pendente. FAB não ativo.', { duration: 3000 })}
      >
        <Plus size={28} />
      </button>
    </div>
  )
}
