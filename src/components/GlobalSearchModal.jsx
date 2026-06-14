import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Wallet, ArrowUpCircle, ArrowDownCircle, Loader2, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function GlobalSearchModal({ isOpen, onClose }) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ accounts: [], transactions: [] })
  const [loading, setLoading] = useState(false)

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults({ accounts: [], transactions: [] })
    }
  }, [isOpen])

  // Efeito de Busca com Debounce (Espera o usuário parar de digitar)
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (!query.trim() || !user) {
        setResults({ accounts: [], transactions: [] })
        return
      }

      setLoading(true)
      try {
        const searchTerm = `%${query}%`

        // 1. Buscar Contas
        const { data: accounts } = await supabase
          .from('accounts')
          .select('id, name, current_balance, bank_slug')
          .ilike('name', searchTerm)
          .limit(3)

        // 2. Buscar Transações (Descrição ou Valor)
        // Nota: O 'or' permite buscar por texto OU converter texto para numero se for valor
        let transQuery = supabase
          .from('transactions')
          .select('id, description, amount, type, date, categories(name)')
          .order('date', { ascending: false })
          .limit(10)

        // Verifica se é número para buscar por valor, senão busca por texto
        if (!isNaN(query) && query.trim() !== '') {
           transQuery = transQuery.eq('amount', query)
        } else {
           transQuery = transQuery.ilike('description', searchTerm)
        }

        const { data: transactions } = await transQuery

        setResults({
          accounts: accounts || [],
          transactions: transactions || []
        })

      } catch (err) {
        console.error('Erro na busca:', err)
      } finally {
        setLoading(false)
      }
    }, 500) // 500ms de espera

    return () => clearTimeout(delayDebounce)
  }, [query, user])

  if (!isOpen) return null

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: -20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[70vh]"
      >
        {/* Input Area */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <Search className="text-slate-400" size={24} />
          <input 
            autoFocus
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquise por contas, pagamentos, valores..."
            className="flex-1 bg-transparent text-lg text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
          />
          {loading ? (
            <Loader2 className="animate-spin text-indigo-500" size={20} />
          ) : (
            <button onClick={onClose} className="p-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs text-slate-500 font-bold px-2">ESC</button>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2">
          
          {/* Empty State Inicial */}
          {!query && (
            <div className="p-8 text-center text-slate-400">
              <p className="text-sm">Digite para buscar em todo o seu histórico financeiro.</p>
            </div>
          )}

          {/* Sem resultados */}
          {query && !loading && results.accounts.length === 0 && results.transactions.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <p>Nenhum resultado encontrado para "{query}"</p>
            </div>
          )}

          {/* Seção: Contas */}
          {results.accounts.length > 0 && (
            <div className="mb-4">
              <h3 className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Contas</h3>
              {results.accounts.map(acc => (
                <div key={acc.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Wallet size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{acc.name}</p>
                      <p className="text-xs text-slate-500 uppercase">{acc.bank_slug}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{formatCurrency(acc.current_balance)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Seção: Transações */}
          {results.transactions.length > 0 && (
            <div>
              <h3 className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Transações</h3>
              {results.transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      {tx.type === 'income' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white line-clamp-1">{tx.description}</p>
                      <p className="text-xs text-slate-500">{tx.categories?.name} • {new Date(tx.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-mono font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-200'}`}>
                    {tx.type === 'income' ? '+' : '-'} {formatCurrency(Math.abs(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>
      </motion.div>
    </div>
  )
}