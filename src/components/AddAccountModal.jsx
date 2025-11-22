import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Search, Check, Loader2, Wallet, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { BANKS } from '../constants/banks'

export default function AddAccountModal({ isOpen, onClose, onAccountCreated }) {
  const { user } = useAuth()
  const [step, setStep] = useState(1) 
  const [searchTerm, setSearchTerm] = useState('')
  
  // Formulário
  const [selectedBank, setSelectedBank] = useState(null)
  const [accountName, setAccountName] = useState('')
  const [balance, setBalance] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setSearchTerm('')
      setAccountName('')
      setBalance('')
      setLoading(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Lógica de Filtro otimizada
  const filteredBanks = BANKS.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectBank = (bank) => {
    setSelectedBank(bank)
    setAccountName(bank.name) 
    setStep(2)
  }

  const handleCreate = async () => {
    if (!accountName) return
    
    setLoading(true)
    try {
      const { error } = await supabase.from('accounts').insert({
        user_id: user.id,
        name: accountName,
        current_balance: parseFloat(balance.replace(',', '.') || 0),
        color: selectedBank.color,
        bank_slug: selectedBank.id,
        type: 'checking'
      })

      if (error) throw error

      onAccountCreated()
      onClose()

    } catch (err) {
      console.error(err)
      alert('Erro ao criar conta.') // Idealmente usar toast aqui se já estiver importado
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md bg-slate-50 dark:bg-slate-900 rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* HEADER FIXO */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {step === 1 ? 'Nova Conta' : 'Configurar Conta'}
          </h2>
          <button onClick={onClose} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full hover:opacity-80 transition-opacity">
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* PASSO 1: ESCOLHER BANCO */}
        {step === 1 && (
          <div className="flex flex-col h-full overflow-hidden">
            
            {/* BARRA DE PESQUISA (STICKY) */}
            <div className="px-4 pt-4 pb-2 bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Pesquisar banco..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                  autoFocus
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* GRID DE BANCOS COM SCROLL */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredBanks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 space-y-2">
                  <AlertCircle size={32} />
                  <p className="text-sm font-medium">Nenhum banco encontrado</p>
                  <button 
                    onClick={() => handleSelectBank({ id: 'money', name: 'Outro / Dinheiro', color: '#64748b', logo: null })}
                    className="text-indigo-600 text-xs font-bold hover:underline"
                  >
                    Usar "Outros"
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 pb-8">
                  {filteredBanks.map(bank => (
                    <button 
                      key={bank.id}
                      onClick={() => handleSelectBank(bank)}
                      className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all aspect-square shadow-sm active:scale-95 group"
                    >
                      <div className="w-10 h-10 relative flex items-center justify-center">
                        {bank.logo ? (
                          <img 
                            src={bank.logo} 
                            alt={bank.name} 
                            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => { e.target.onerror = null; e.target.src = '/logos/vite.svg' }} 
                          />
                        ) : (
                          <Wallet className="text-slate-400" />
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 text-center line-clamp-2 leading-tight">
                        {bank.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PASSO 2: DETALHES (Mantido igual, focado na edição) */}
        {step === 2 && selectedBank && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-in slide-in-from-right-10 bg-slate-50 dark:bg-slate-900">
            
            <div 
              className="w-full h-40 rounded-2xl p-5 shadow-lg flex flex-col justify-between text-white relative overflow-hidden"
              style={{ backgroundColor: selectedBank.color, color: selectedBank.textColor || '#fff' }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
              <div className="flex items-center gap-2 relative z-10">
                {selectedBank.logo && <img src={selectedBank.logo} className="w-8 h-8 object-contain bg-white rounded-full p-0.5 shadow-sm" />}
                <span className="font-bold text-sm opacity-90">{selectedBank.name}</span>
              </div>
              <div className="relative z-10">
                <p className="text-xs opacity-80 uppercase font-semibold">Saldo Atual</p>
                <p className="text-2xl font-mono font-bold tracking-tight">R$ {balance || '0,00'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Nome da Conta</label>
                <input 
                  type="text" 
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full mt-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white font-medium focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Saldo Inicial</label>
                <div className="relative mt-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                  <input 
                    type="number" 
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-3 pl-10 text-slate-900 dark:text-white font-mono font-bold text-lg focus:border-indigo-500 outline-none transition-all"
                    autoFocus
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => setStep(1)}
                className="px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                Voltar
              </button>
              <button 
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-bold py-3 shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95 transition-transform"
              >
                {loading ? <Loader2 className="animate-spin" /> : <>Confirmar <Check size={18} /></>}
              </button>
            </div>
          </div>
        )}

      </motion.div>
    </div>
  )
}