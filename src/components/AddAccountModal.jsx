import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Search, Check, Loader2, Wallet, AlertCircle, ChevronLeft } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { BANKS } from '../constants/banks'

export default function AddAccountModal({ isOpen, onClose, onAccountCreated }) {
  const { user } = useAuth()
  const [step, setStep] = useState(1) 
  const [searchTerm, setSearchTerm] = useState('')
  
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
      alert('Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    // Z-INDEX ALTO (70) para ficar acima do Footer Navigation (que costuma ser 50)
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center p-0 sm:p-4">
      
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Sheet / Modal */}
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        // AJUSTE: No mobile (padrão), ocupa largura total e fica colado embaixo.
        // max-h-[92vh] garante que suba bastante mas deixe um teto visível.
        className="relative w-full sm:max-w-md bg-slate-50 dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] h-full sm:h-auto"
      >
        {/* Alça de Puxar (Visual Only para Mobile) */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md absolute top-0 z-30 rounded-t-3xl" onClick={onClose}>
           <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 pt-8 sm:pt-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
             {step === 2 && (
               <button onClick={() => setStep(1)} className="p-1 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                 <ChevronLeft size={24} />
               </button>
             )}
             <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {step === 1 ? 'Nova Conta' : 'Configurar'}
             </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full hover:opacity-80 transition-opacity">
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 pb-safe"> {/* pb-safe respeita a área do iPhone X+ */}
          
          {/* PASSO 1 */}
          {step === 1 && (
            <div className="space-y-4 pb-20"> {/* Padding bottom extra para garantir scroll final */}
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Pesquisar banco..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-4 pl-11 pr-10 text-base text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                  // autoFocus removido no mobile para não abrir teclado e cobrir tudo de cara
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"><X size={16} /></button>
                )}
              </div>

              {filteredBanks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 space-y-2">
                  <AlertCircle size={32} />
                  <p className="text-sm font-medium">Nenhum banco encontrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {filteredBanks.map(bank => (
                    <button 
                      key={bank.id}
                      onClick={() => handleSelectBank(bank)}
                      className="flex flex-col items-center justify-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all aspect-square shadow-sm"
                    >
                      <div className="w-12 h-12 relative flex items-center justify-center">
                        {bank.logo ? (
                          <img src={bank.logo} alt={bank.name} className="w-full h-full object-contain" onError={(e) => { e.target.onerror = null; e.target.src = '/logos/vite.svg' }} />
                        ) : (
                          <Wallet className="text-slate-400" size={32} />
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
          )}

          {/* PASSO 2 */}
          {step === 2 && selectedBank && (
            <div className="space-y-6 pb-8">
              <div 
                className="w-full h-48 rounded-2xl p-6 shadow-lg flex flex-col justify-between text-white relative overflow-hidden shrink-0"
                style={{ backgroundColor: selectedBank.color, color: selectedBank.textColor || '#fff' }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="flex items-center gap-3 relative z-10">
                  {selectedBank.logo && <img src={selectedBank.logo} className="w-10 h-10 object-contain bg-white rounded-full p-1 shadow-sm" />}
                  <span className="font-bold text-lg opacity-90">{selectedBank.name}</span>
                </div>
                <div className="relative z-10">
                  <p className="text-xs opacity-80 uppercase font-semibold mb-1">Saldo Atual</p>
                  <p className="text-3xl font-mono font-bold tracking-tight">R$ {balance || '0,00'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Nome da Conta</label>
                  <input 
                    type="text" 
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full mt-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white font-medium focus:border-indigo-500 outline-none text-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Saldo Inicial</label>
                  <div className="relative mt-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">R$</span>
                    <input 
                      type="number" 
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 pl-12 text-slate-900 dark:text-white font-mono font-bold text-2xl focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleCreate}
                  disabled={loading}
                  className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95 transition-transform"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <>Confirmar <Check size={20} /></>}
                </button>
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  )
}
