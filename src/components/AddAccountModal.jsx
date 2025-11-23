import { useState } from 'react'
import { useNavigate } from 'react-router-dom' // <--- IMPORTANTE
import { motion } from 'framer-motion'
import { X, Search, Wallet, AlertCircle } from 'lucide-react'
import { BANKS } from '../constants/banks'

export default function AddAccountModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')

  if (!isOpen) return null

  const filteredBanks = BANKS.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectBank = (bank) => {
    // 1. Fecha o modal
    onClose()
    
    // 2. Navega para a página de criação passando o banco escolhido no estado
    navigate('/accounts/new', { 
      state: { preSelectedBankId: bank.id } 
    })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center p-0 sm:p-4">
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
        className="relative w-full sm:max-w-md bg-slate-50 dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nova Conexão</h2>
          <button onClick={onClose} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full hover:opacity-80 transition-opacity">
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Conteúdo Scrollável */}
        <div className="flex-1 overflow-y-auto p-4 pb-safe">
          <div className="space-y-4 pb-10">
            
            {/* Barra de Busca */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Pesquisar instituição..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-4 pl-11 pr-10 text-base text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                autoFocus
              />
            </div>

            {/* Grid de Bancos */}
            {filteredBanks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400 space-y-2">
                <AlertCircle size={32} />
                <p className="text-sm font-medium">Nenhum banco encontrado</p>
                <button 
                  onClick={() => handleSelectBank({ id: 'money', name: 'Outro / Carteira', color: '#64748b', logo: null })}
                  className="text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:underline"
                >
                  Usar "Outros"
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {filteredBanks.map(bank => (
                  <button 
                    key={bank.id}
                    onClick={() => handleSelectBank(bank)}
                    className="flex flex-col items-center justify-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 active:scale-95 transition-all aspect-square shadow-sm group"
                  >
                    <div className="w-12 h-12 relative flex items-center justify-center transition-transform group-hover:scale-110">
                      {bank.logo ? (
                        <img 
                          src={bank.logo} 
                          alt={bank.name} 
                          className="w-full h-full object-contain" 
                          onError={(e) => { e.target.onerror = null; e.target.src = '/logos/vite.svg' }} 
                        />
                      ) : (
                        <Wallet className="text-slate-400 group-hover:text-indigo-500" size={32} />
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 text-center line-clamp-2 leading-tight">
                      {bank.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}