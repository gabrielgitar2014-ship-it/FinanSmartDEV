import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, Filter, Plus, ShoppingBag, Coffee, Car, DollarSign, Home, 
  Smartphone, ChevronDown 
} from 'lucide-react'
import { useTransactions } from '../hooks/useTransactions'

export default function TransactionsPage() {
  const { groupedTransactions, loading, error, formatDateHeader } = useTransactions()
  
  // Helper para mapear ícones (Você pode expandir isso depois)
  const getCategoryIcon = (categoryName) => {
    const name = categoryName?.toLowerCase() || ''
    if (name.includes('mercado') || name.includes('compra')) return <ShoppingBag size={20} />
    if (name.includes('aliment') || name.includes('lanch')) return <Coffee size={20} />
    if (name.includes('transp') || name.includes('uber')) return <Car size={20} />
    if (name.includes('casa') || name.includes('aluguel')) return <Home size={20} />
    return <DollarSign size={20} />
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  if (error) return <div className="p-8 text-center text-red-500">Erro ao carregar extrato.</div>

  return (
    <div className="pb-28 lg:pb-0 relative min-h-screen">
      
      {/* --- HEADER FIXO (Busca e Título) --- */}
      <div className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-30 px-4 pt-4 pb-2 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Transações</h1>
          <button className="p-2 bg-white rounded-full shadow-sm text-slate-500 hover:text-indigo-600">
            <Search size={20} />
          </button>
        </div>

        {/* Filtros (Chips) */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {['Data', 'Categoria', 'Tipo'].map((filter) => (
            <button 
              key={filter}
              className="flex items-center gap-1 px-4 py-1.5 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600 whitespace-nowrap shadow-sm active:scale-95 transition-transform"
            >
              {filter} <ChevronDown size={14} />
            </button>
          ))}
        </div>
        
        <div className="text-xs text-slate-400 font-medium px-1">
          Últimos 30 dias
        </div>
      </div>

      {/* --- LISTA DE TRANSAÇÕES --- */}
      <div className="px-4 space-y-6 mt-2">
        
        {loading ? (
          // Skeleton Loading
          [1, 2].map(i => (
            <div key={i} className="space-y-3">
              <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
              <div className="h-16 bg-white rounded-2xl shadow-sm animate-pulse" />
              <div className="h-16 bg-white rounded-2xl shadow-sm animate-pulse" />
            </div>
          ))
        ) : Object.keys(groupedTransactions).length === 0 ? (
          // Empty State
          <div className="text-center py-20 text-slate-400">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={32} />
            </div>
            <p>Nenhuma transação encontrada.</p>
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
              <h3 className="text-xs font-bold text-slate-500 mb-3 ml-1 uppercase tracking-wide">
                {formatDateHeader(dateKey)}
              </h3>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                {transactions.map((item, index) => (
                  <div 
                    key={item.id} 
                    className={`flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                      index !== transactions.length - 1 ? 'border-b border-slate-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Ícone com Cor Dinâmica */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-sm ${
                        item.type === 'income' ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`}>
                        {getCategoryIcon(item.categories?.name)}
                      </div>
                      
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.description}</p>
                        <p className="text-xs text-slate-500">{item.categories?.name || 'Geral'}</p>
                      </div>
                    </div>

                    <span className={`text-sm font-bold whitespace-nowrap ${
                      item.type === 'income' ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {item.type === 'expense' ? '- ' : ''}
                      {formatCurrency(item.amount)}
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
        className="fixed bottom-24 lg:bottom-10 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-600/30 flex items-center justify-center transition-transform hover:scale-110 active:scale-90 z-40"
        onClick={() => console.log('Abrir Modal Nova Transação')}
      >
        <Plus size={28} />
      </button>

    </div>
  )
}