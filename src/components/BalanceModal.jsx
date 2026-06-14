import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Check, Loader2, DollarSign } from 'lucide-react'

export default function BalanceModal({ isOpen, onClose, account, onSave }) {
  const [balance, setBalance] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (account) setBalance(String(account.current_balance))
  }, [account])

  if (!isOpen) return null

  const handleSave = async () => {
    setLoading(true)
    // Converte string "1.000,50" ou "1000.50" para float
    const numericBalance = parseFloat(balance.toString().replace(',', '.'))
    await onSave(account.id, { current_balance: numericBalance })
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 dark:text-white">Ajustar Saldo</h3>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              Ajuste manual do valor atual. Isso não cria uma transação no extrato.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Saldo Atual</label>
            <div className="relative mt-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
              <input 
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 font-mono text-xl font-bold text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Atualizar Saldo <Check size={18} /></>}
          </button>
        </div>
      </motion.div>
    </div>
  )
}