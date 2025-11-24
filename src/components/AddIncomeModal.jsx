import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Check, Loader2, Calendar, Tag, Wallet, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { isAfter, startOfDay, parseISO } from 'date-fns'

import { supabase } from '../lib/supabaseClient'
import { useAccounts } from '../hooks/useAccounts'
import { useCategories } from '../hooks/useCategories'

export default function AddIncomeModal({ isOpen, onClose, onSuccess }) {
  const { accounts } = useAccounts()
  const { categories } = useCategories()

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('') 
  const [observation, setObservation] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setAmount(''); setDescription(''); setObservation(''); setCategoryId(''); setAccountId('')
      setDate(new Date().toISOString().split('T')[0])
      setLoading(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  // FILTRO: Apenas categorias de RECEITA
  const filteredCategories = categories.filter(c => c.type === 'income')

  const handleSubmit = async () => {
    if (!amount || !description || !categoryId || !accountId) return toast.error('Preencha os campos obrigatórios')

    setLoading(true)
    try {
      const numericAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'))
      if (isNaN(numericAmount) || numericAmount <= 0) throw new Error("Valor inválido")

      const finalAmount = Math.abs(numericAmount)
      const isFutureTransaction = isAfter(startOfDay(parseISO(date)), startOfDay(new Date()))
      
      // 1. Criar Transação
      const { error: transError } = await supabase.from('transactions').insert({
        description, 
        amount: finalAmount,
        type: 'income',
        date: date,
        category_id: categoryId,
        account_id: accountId,
        status: 'completed',
        observation: observation
      })

      if (transError) throw transError

      // 2. Atualizar Saldo (APENAS SE NÃO FOR FUTURO)
      if (!isFutureTransaction) {
          const { data: accData } = await supabase.from('accounts').select('current_balance').eq('id', accountId).single()
          const currentBalance = parseFloat(accData?.current_balance || 0)
          await supabase.from('accounts').update({ current_balance: currentBalance + finalAmount }).eq('id', accountId)
      }

      toast.success(isFutureTransaction ? 'Receita agendada!' : 'Receita recebida!')
      if (onSuccess) onSuccess()
      onClose()

    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/\D/g, '')
    if (!value) { setAmount(''); return }
    const numberValue = parseFloat(value) / 100
    setAmount(numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end lg:items-center justify-center p-0 lg:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/10 shrink-0 z-10">
            <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">Nova Receita</h2>
            <button onClick={onClose} className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1 pb-24">
          
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Valor</label>
            <div className="relative mt-1">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-bold text-emerald-500">R$</span>
              <input type="text" inputMode="numeric" value={amount} onChange={handleAmountChange} placeholder="0,00" className="w-full bg-transparent border-b-2 border-emerald-100 focus:border-emerald-500 py-2 pl-10 text-3xl font-bold text-slate-900 dark:text-white outline-none" autoFocus />
            </div>
          </div>

          <input type="text" placeholder="Origem (ex: Salário, Venda)" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none" />

          <div className="space-y-4">
             <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 ml-1">Conta de Entrada</label>
                <div className="relative"><Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 pl-9 text-sm font-medium text-slate-700 dark:text-slate-200 appearance-none outline-none focus:ring-2 focus:ring-emerald-500"><option value="" disabled>Selecionar conta</option>{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 ml-1">Categoria</label><div className="relative"><Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 pl-9 text-sm font-medium text-slate-700 dark:text-slate-200 appearance-none outline-none focus:ring-2 focus:ring-emerald-500"><option value="" disabled>Selecionar</option>{filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>
            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 ml-1">Mês Referência</label><div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 pl-9 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" /></div></div>
          </div>

          <div><label className="text-xs font-bold text-slate-500 ml-1">Observação</label><div className="relative"><FileText className="absolute left-3 top-3 text-slate-400" size={16} /><textarea value={observation} onChange={e => setObservation(e.target.value)} rows={2} className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 pl-9 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"/></div></div>
        </div>

        {/* Footer Fixo */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 z-20 pb-safe">
            <button onClick={handleSubmit} disabled={loading} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70">
                {loading ? <Loader2 className="animate-spin" /> : <>Confirmar Receita <Check size={20} /></>}
            </button>
        </div>

      </motion.div>
    </div>
  )
}