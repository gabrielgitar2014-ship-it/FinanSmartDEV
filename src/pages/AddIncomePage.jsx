import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Check, Loader2, Calendar, Tag, Wallet, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { isAfter, startOfDay, parseISO } from 'date-fns'

import { supabase } from '../lib/supabaseClient'
import { useAccounts } from '../hooks/useAccounts'
import { useCategories } from '../hooks/useCategories'

export default function AddIncomePage() {
  const navigate = useNavigate()
  const { accounts } = useAccounts()
  const { categories } = useCategories()

  // Estados do Formulário
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('') 
  const [observation, setObservation] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  
  const [loading, setLoading] = useState(false)

  // Filtra apenas categorias de RECEITA
  const filteredCategories = categories.filter(c => c.type === 'income')

  const handleSubmit = async () => {
    if (!amount || !description || !categoryId || !accountId) return toast.error('Preencha todos os campos obrigatórios')

    setLoading(true)
    try {
      const numericAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'))
      if (isNaN(numericAmount) || numericAmount <= 0) throw new Error("Valor inválido")

      const finalAmount = Math.abs(numericAmount)
      
      // Verifica se é lançamento futuro
      const isFutureTransaction = isAfter(startOfDay(parseISO(date)), startOfDay(new Date()))
      
      // 1. Criar Transação
      const { error: transError } = await supabase.from('transactions').insert({
        description, 
        amount: finalAmount, // Positivo
        type: 'income',
        date: date,
        category_id: categoryId,
        account_id: accountId,
        status: 'completed',
        observation: observation
      })

      if (transError) throw transError

      // 2. Atualizar Saldo da Conta (APENAS SE NÃO FOR FUTURO)
      if (!isFutureTransaction) {
          const { data: accData } = await supabase.from('accounts').select('current_balance').eq('id', accountId).single()
          const currentBalance = parseFloat(accData?.current_balance || 0)
          
          // Soma ao saldo atual
          await supabase.from('accounts')
            .update({ current_balance: currentBalance + finalAmount })
            .eq('id', accountId)
      }

      toast.success(isFutureTransaction ? 'Receita agendada!' : 'Receita recebida!')
      navigate(-1) // Volta para a página anterior

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32 animate-in fade-in duration-300 relative">
      
      {/* HEADER FIXO */}
      <div className="sticky top-0 z-20 px-4 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ChevronLeft size={24} className="text-slate-600 dark:text-slate-300" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Nova Receita</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
          
          {/* Valor */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Valor</label>
            <div className="relative mt-1">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-bold text-emerald-500">R$</span>
              <input 
                type="text" inputMode="numeric" value={amount} onChange={handleAmountChange} placeholder="0,00"
                className="w-full bg-transparent border-b-2 border-emerald-100 focus:border-emerald-500 py-2 pl-10 text-4xl font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-300"
                autoFocus
              />
            </div>
          </div>

          <input 
            type="text" placeholder="Origem (ex: Salário, Venda)" value={description} onChange={e => setDescription(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-lg font-medium outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {/* Conta */}
          <div className="space-y-4">
             <div>
                <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Conta de Entrada</label>
                <div className="relative mt-1">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pl-10 font-bold text-slate-700 dark:text-slate-200 appearance-none outline-none focus:ring-2 focus:ring-emerald-500 h-[50px]">
                    <option value="" disabled>Selecionar conta</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Categoria</label>
              <div className="relative mt-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pl-9 font-medium text-slate-700 dark:text-slate-200 appearance-none outline-none focus:ring-2 focus:ring-emerald-500 h-[50px]">
                  <option value="" disabled>Selecionar</option>
                  {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Data</label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pl-9 font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 h-[50px]" />
              </div>
            </div>
          </div>

          {/* Observação */}
          <div>
             <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Observação (Opcional)</label>
             <div className="relative mt-1">
                <FileText className="absolute left-3 top-3 text-slate-400" size={16} />
                <textarea 
                    value={observation} onChange={e => setObservation(e.target.value)} rows={3}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pl-9 font-medium outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
             </div>
          </div>
      </div>

      {/* Footer Fixo */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-30">
        <button onClick={handleSubmit} disabled={loading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70">
            {loading ? <Loader2 className="animate-spin" /> : <>Confirmar Receita <Check size={20} /></>}
        </button>
      </div>

    </div>
  )
}