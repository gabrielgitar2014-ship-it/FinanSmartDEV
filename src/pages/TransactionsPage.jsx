import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Filter, Plus, ShoppingBag, Home, Car, DollarSign, 
  ChevronDown, Settings, AlertCircle, Activity, Tag, Trash2, Layers 
} from 'lucide-react'
import { toast } from 'sonner'

import { useTransactions } from '../hooks/useTransactions'
import { useDashboard } from '../hooks/useDashboard'
import { useUIStore } from '../store/useUIStore'

import ConfirmationModal from '../components/ConfirmationModal'

export default function TransactionsPage() {

  const navigate = useNavigate()

  /* ============ HOOKS ============ */
  const { 
    groupedTransactions,
    loading,
    error,
    deleteTransaction,
    formatDateHeader,
    page,
    totalPages,
    nextPage,
    prevPage
  } = useTransactions()

  const { refetch: refetchDashboard } = useDashboard()
  const { showValues } = useUIStore()

  /* ============ ESTADO DE DELETE ============ */
  const [txToDelete, setTxToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)


  /* ============ FORMATADORES ============ */
  const formatCurrency = (value) => {
    if (!showValues) return '••••••'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const getCategoryIcon = (categoryName) => {
    const name = categoryName?.toLowerCase() || ''
    if (name.includes('alimentação') || name.includes('mercado')) return <ShoppingBag size={20} />
    if (name.includes('moradia') || name.includes('aluguel')) return <Home size={20} />
    if (name.includes('transporte') || name.includes('car')) return <Car size={20} />
    if (name.includes('saúde')) return <Activity size={20} />
    if (name.includes('salário') || name.includes('receita')) return <DollarSign size={20} />
    return <Tag size={20} />
  }


  /* ============ DELETE ============ */
  const handleDelete = async (mode = 'single') => {
    if (!txToDelete) return

    setIsDeleting(true)

    const result = await deleteTransaction(txToDelete.id, mode)

    if (result.success) {
      toast.success(
        mode === 'all' 
          ? 'Parcelamento excluído e limite estornado!'
          : 'Transação excluída e saldo/limite estornado!'
      )
      refetchDashboard()
    } else {
      toast.error('Erro ao excluir: ' + result.error)
    }

    setIsDeleting(false)
    setTxToDelete(null)
  }


  /* ============ LOADING ============ */
  if (loading) {
    return (
      <div className="p-8 space-y-3">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Extrato Completo</h1>
        {[1,2,3].map(i => (
          <div key={i} className="h-20 bg-white dark:bg-slate-900 rounded-3xl shadow-sm animate-pulse" />
        ))}
      </div>
    )
  }


  /* ============ ERRO ============ */
  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
          <AlertCircle className="inline mr-2" size={16} />
          Erro: {error}
        </div>
      </div>
    )
  }


  /* ============ RENDERIZAÇÃO PRINCIPAL ============ */
  return (
    <div className="pb-28 lg:pb-0 relative min-h-screen animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm z-30 px-4 pt-4 pb-2 space-y-4 border-b border-slate-100 dark:border-slate-800 lg:border-b-0">

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Extrato Completo</h1>
          <button className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm text-slate-500 hover:text-indigo-600 transition-colors">
            <Search size={20} />
          </button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          <div className="flex gap-3">
            {['Data','Categoria','Conta'].map(filter => (
              <button 
                key={filter}
                className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 
                           border border-slate-200 dark:border-slate-700 rounded-full 
                           text-sm font-medium text-slate-600 dark:text-slate-300 
                           whitespace-nowrap shadow-sm active:scale-95 transition-transform"
              >
                {filter} <ChevronDown size={14}/>
              </button>
            ))}
          </div>

          <Link 
            to="/transactions/categories"
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline 
                       flex items-center gap-1 transition-colors shrink-0 whitespace-nowrap"
          >
            <Settings size={14}/> Categorias
          </Link>
        </div>
      </div>


      {/* LISTA */}
      <div className="px-4 space-y-6 mt-4">

        {Object.keys(groupedTransactions ?? {}).length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 
                            rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={32} />
            </div>
            <p className="dark:text-slate-400">Nenhuma transação encontrada.</p>
          </div>
        ) : (
          Object.entries(groupedTransactions ?? {}).map(([dateKey, transactions]) => (
            <motion.div
              key={dateKey}
              initial={{ opacity:0, y:10 }}
              whileInView={{ opacity:1, y:0 }}
              viewport={{ once:true }}
            >

              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 ml-1 uppercase tracking-wide">
                {formatDateHeader(dateKey)}
              </h3>

              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg 
                              border border-slate-100 dark:border-slate-800 overflow-hidden">

                {transactions.map((item, index) => (
                  <div 
                    key={item.id}
                    className={`flex items-center justify-between p-4 
                                hover:bg-slate-50 dark:hover:bg-slate-800 
                                transition-colors cursor-pointer group
                                ${index !== transactions.length - 1 
                                  ? 'border-b border-slate-100 dark:border-slate-800/70' 
                                  : ''}`}
                  >

                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-inner shrink-0
                                      ${item.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {getCategoryIcon(item.category)}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate pr-2">{item.description}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">

                          {item.category}

                          {item.installment_total > 1 && (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 rounded text-[9px] border border-slate-200 dark:border-slate-700">
                              {item.installment_number}/{item.installment_total}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">

                      <span className={`text-sm font-bold whitespace-nowrap font-mono
                                       ${item.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {item.type === 'expense' ? '- ' : '+'}
                        {formatCurrency(Math.abs(item.amount))}
                      </span>

                      <button 
                        onClick={(e) => { e.stopPropagation(); setTxToDelete(item) }}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 
                                   dark:hover:bg-red-900/20 rounded-full transition-colors"
                      >
                        <Trash2 size={16}/>
                      </button>

                    </div>

                  </div>
                ))}

              </div>

            </motion.div>
          ))
        )}

      </div>


      {/* PAGINAÇÃO */}
      <div className="flex items-center justify-center gap-4 py-6">
        <button 
          onClick={prevPage}
          disabled={page === 1}
          className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border 
                     border-slate-200 dark:border-slate-700 disabled:opacity-40"
        >
          ⬅ Anterior
        </button>

        <span className="text-sm text-slate-600 dark:text-slate-400">
          Página {page} de {totalPages}
        </span>

        <button 
          onClick={nextPage}
          disabled={page === totalPages}
          className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border 
                     border-slate-200 dark:border-slate-700 disabled:opacity-40"
        >
          Próxima ➡
        </button>
      </div>


      {/* FAB */}
      <button 
        className="fixed bottom-24 lg:bottom-10 right-6 w-14 h-14 
                   bg-indigo-600 hover:bg-indigo-700 text-white rounded-full 
                   shadow-xl shadow-indigo-600/30 flex items-center justify-center 
                   transition-transform hover:scale-110 active:scale-90 z-40"
        onClick={() => navigate('/dashboard')}
      >
        <Plus size={28}/>
      </button>


      {/* MODAL */}
      <AnimatePresence>
        {txToDelete && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">

            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setTxToDelete(null)}
            />

            <motion.div
              initial={{ scale:0.9, opacity:0 }}
              animate={{ scale:1, opacity:1 }}
              exit={{ scale:0.9, opacity:0 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl w-full max-w-sm 
                         relative z-10 shadow-2xl border border-slate-100 dark:border-slate-800"
            >

              <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-500">
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-full">
                  <Trash2 size={24}/>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Excluir Transação?
                </h3>
              </div>

              <div className="mb-6 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl 
                              border border-slate-100 dark:border-slate-700">
                <p className="font-bold text-slate-900 dark:text-white">{txToDelete.description}</p>
                <p className="text-xs text-slate-500 mb-2">{txToDelete.date}</p>
                <p className={`text-xl font-mono font-bold 
                               ${txToDelete.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                  {formatCurrency(Math.abs(txToDelete.amount))}
                </p>
              </div>

              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                O valor será estornado para o saldo da conta ou limite do cartão.
                Essa ação não pode ser desfeita.
              </p>


              {txToDelete.installment_total > 1 && txToDelete.installment_id ? (
                <div className="space-y-3">
                  <button 
                    onClick={() => handleDelete('single')}
                    className="w-full py-3 bg-slate-100 dark:bg-slate-800 
                               hover:bg-slate-200 dark:hover:bg-slate-700 
                               text-slate-700 dark:text-slate-200 font-bold 
                               rounded-xl transition-colors text-sm"
                  >
                    Excluir apenas esta (Parcela {txToDelete.installment_number})
                  </button>

                  <button 
                    onClick={() => handleDelete('all')}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white 
                               font-bold rounded-xl shadow-lg shadow-red-500/20 
                               transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <Layers size={16}/> 
                    Excluir todas as {txToDelete.installment_total} parcelas
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button 
                    onClick={() => setTxToDelete(null)}
                    className="flex-1 py-3 text-slate-500 hover:bg-slate-50 
                               dark:hover:bg-slate-800 rounded-xl font-bold transition-colors"
                  >
                    Cancelar
                  </button>

                  <button 
                    onClick={() => handleDelete('single')}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 
                               text-white font-bold rounded-xl shadow-lg 
                               shadow-red-500/20 transition-all"
                  >
                    Excluir
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
