import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Search, Check, Plus } from 'lucide-react'
import { AVAILABLE_CURRENCIES } from '../hooks/useCurrencies'

export default function AddCurrencyModal({ isOpen, onClose, onSelect, selectedCurrencies }) {
  const [search, setSearch] = useState('')

  if (!isOpen) return null

  // Filtra moedas pelo nome ou código (USD, Dólar...)
  const filtered = AVAILABLE_CURRENCIES.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
      />
      
      {/* Modal Card */}
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Adicionar Moeda</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Barra de Busca */}
        <div className="p-4 pb-0">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                    autoFocus
                    placeholder="Buscar moeda (ex: Dolar, Euro, BTC)"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
            </div>
        </div>

        {/* Lista de Moedas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filtered.map(currency => {
                const isSelected = selectedCurrencies.includes(currency.code)
                return (
                    <button
                        key={currency.code}
                        onClick={() => {
                            onSelect(currency.code) // <--- AQUI: Envia a escolha para o ProfileSettings
                            onClose()
                        }}
                        disabled={isSelected}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all group ${
                            isSelected 
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 opacity-60 cursor-default' 
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-xl shadow-sm">
                                {currency.flag || currency.symbol}
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-sm text-slate-900 dark:text-white">
                                  {currency.code}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {currency.name}
                                </p>
                            </div>
                        </div>

                        {isSelected ? (
                            <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-1 rounded-md">
                                <Check size={12} /> Adicionado
                            </div>
                        ) : (
                            <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full text-slate-400 group-hover:text-white group-hover:bg-indigo-600 transition-all">
                                <Plus size={16} />
                            </div>
                        )}
                    </button>
                )
            })}

            {/* Empty State */}
            {filtered.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                    Nenhuma moeda encontrada para "{search}".
                </div>
            )}
        </div>
      </motion.div>
    </div>
  )
}