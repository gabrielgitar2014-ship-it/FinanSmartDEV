import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Check, Loader2, Calendar, Wallet, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

import { supabase } from '../lib/supabaseClient'
import { useAccounts } from '../hooks/useAccounts'
import { useCategories } from '../hooks/useCategories'

const formatBR = (n) =>
  Number(n || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export default function PayInvoiceModal({ isOpen, onClose, card, invoiceTotal = 0, onSuccess }) {
  const { accounts } = useAccounts()
  const { categories } = useCategories()
  const queryClient = useQueryClient()

  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setAmount(formatBR(invoiceTotal))
      setAccountId(card?.account_id || '')
      setDate(new Date().toISOString().split('T')[0])
      setLoading(false)
    }
  }, [isOpen, invoiceTotal, card])

  if (!isOpen) return null

  const paymentCategory = categories.find(
    (c) => c.type === 'expense' && c.name === 'Pagamento de fatura'
  )

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/\D/g, '')
    if (!value) { setAmount(''); return }
    setAmount(formatBR(parseFloat(value) / 100))
  }

  const handleSubmit = async () => {
    if (!accountId) return toast.error('Selecione a conta de pagamento')
    const numericAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'))
    if (isNaN(numericAmount) || numericAmount <= 0) return toast.error('Valor inválido')

    setLoading(true)
    try {
      const { error } = await supabase.rpc('pay_card_invoice', {
        p_card_id: card.id,
        p_account_id: accountId,
        p_amount: numericAmount,
        p_category_id: paymentCategory?.id || null,
        p_date: date,
        p_description: `Pagamento fatura ${card.name || ''}`.trim(),
      })
      if (error) throw error

      queryClient.invalidateQueries(['dashboard'])
      queryClient.invalidateQueries(['transactions'])

      toast.success('Fatura paga! Limite atualizado.')
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao pagar fatura: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end lg:items-center justify-center p-0 lg:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/10 shrink-0 z-10">
          <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <Receipt size={20} /> Pagar fatura
          </h2>
          <button onClick={onClose} className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1 pb-24">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Valor pago</label>
            <div className="relative mt-1">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-bold text-indigo-500">R$</span>
              <input
                type="text" inputMode="numeric" value={amount} onChange={handleAmountChange} placeholder="0,00"
                className="w-full bg-transparent border-b-2 border-indigo-100 focus:border-indigo-500 py-2 pl-10 text-3xl font-bold text-slate-900 dark:text-white outline-none"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Fatura: R$ {formatBR(invoiceTotal)}. Você pode pagar total ou parcial.</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 ml-1">Pagar com (conta)</label>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 pl-9 text-sm font-medium text-slate-700 dark:text-slate-200 appearance-none outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="" disabled>Selecionar conta</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 ml-1">Data do pagamento</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 pl-9 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 z-20 pb-safe">
          <button onClick={handleSubmit} disabled={loading} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70">
            {loading ? <Loader2 className="animate-spin" /> : <>Confirmar pagamento <Check size={20} /></>}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
