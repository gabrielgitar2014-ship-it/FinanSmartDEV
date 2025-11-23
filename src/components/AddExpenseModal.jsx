import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Check, Loader2, Calendar, Tag, Wallet, CreditCard, Layers, FileText, QrCode } from 'lucide-react'
import { toast } from 'sonner'
import { addMonths, getDate } from 'date-fns'

import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useAccounts } from '../hooks/useAccounts'
import { useCategories } from '../hooks/useCategories'

export default function AddExpenseModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth()
  const { accounts } = useAccounts()
  const { categories } = useCategories()

  // Estados Fixos
  const type = 'expense'
  
  // Estados do Formulário
  const [paymentMethod, setPaymentMethod] = useState('debit') // 'debit' | 'credit' | 'pix'
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [observation, setObservation] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [selectedCardId, setSelectedCardId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  
  // Parcelamento
  const [isInstallment, setIsInstallment] = useState(false)
  const [installments, setInstallments] = useState(2)

  // Dados Auxiliares
  const [accountCards, setAccountCards] = useState([])
  const [selectedCardData, setSelectedCardData] = useState(null)
  const [loading, setLoading] = useState(false)

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setAmount('')
      setDescription('')
      setObservation('')
      setCategoryId('')
      setAccountId('')
      setSelectedCardId('')
      setSelectedCardData(null)
      setDate(new Date().toISOString().split('T')[0])
      setIsInstallment(false)
      setInstallments(2)
      setPaymentMethod('debit')
      setLoading(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Filtra apenas categorias de DESPESA
  const filteredCategories = categories.filter(c => c.type === 'expense')

  // Busca cartões da conta selecionada
  useEffect(() => {
    if (accountId) {
      const fetchCards = async () => {
        const { data } = await supabase
          .from('credit_cards')
          .select('id, name, available_limit, closing_day')
          .eq('account_id', accountId)
        
        setAccountCards(data || [])
        // Lógica inteligente: se tem cartão, sugere crédito
        if (data && data.length > 0) setPaymentMethod('credit')
        else setPaymentMethod('debit')
      }
      fetchCards()
    } else {
      setAccountCards([])
    }
  }, [accountId])

  // Atualiza dados do cartão selecionado
  useEffect(() => {
    if (selectedCardId) {
      setSelectedCardData(accountCards.find(c => c.id === selectedCardId))
    } else {
      setSelectedCardData(null)
    }
  }, [selectedCardId, accountCards])

  const handleSubmit = async () => {
    if (!amount || !description || !categoryId || !accountId) return toast.error('Preencha os campos obrigatórios')
    if (paymentMethod === 'credit' && !selectedCardId) return toast.error('Selecione o cartão')

    setLoading(true)
    try {
      const numericAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'))
      if (isNaN(numericAmount) || numericAmount <= 0) throw new Error("Valor inválido")

      let baseDate = new Date(date + 'T12:00:00')
      let startMonthOffset = 0

      // Lógica de Fechamento de Fatura
      if (paymentMethod === 'credit' && selectedCardData?.closing_day) {
        const purchaseDay = getDate(baseDate)
        // Se comprou DEPOIS ou NO DIA do fechamento, a 1ª parcela cai no mês seguinte
        if (purchaseDay >= selectedCardData.closing_day) {
          startMonthOffset = 1
        }
      }

      if (isInstallment && paymentMethod === 'credit') {
        // --- PARCELADO (CRÉDITO) ---
        const installmentValue = numericAmount / installments
        const transactionsToInsert = []
        
        for (let i = 0; i < installments; i++) {
            const installmentDate = addMonths(baseDate, i + startMonthOffset)
            transactionsToInsert.push({
                description: `${description} (${i + 1}/${installments})`,
                amount: -Math.abs(installmentValue), // Valor negativo
                type: 'expense',
                date: installmentDate.toISOString().split('T')[0],
                category_id: categoryId,
                account_id: accountId,
                credit_card_id: selectedCardId,
                status: 'completed',
                installment_number: i + 1,
                installment_total: installments,
                observation: observation
            })
        }

        const { error } = await supabase.from('transactions').insert(transactionsToInsert)
        if (error) throw error

        // Consome limite total
        const currentLimit = selectedCardData?.available_limit || 0
        await supabase.from('credit_cards').update({ available_limit: currentLimit - numericAmount }).eq('id', selectedCardId)

      } else {
        // --- À VISTA (DÉBITO / PIX / CRÉDITO) ---
        const finalAmount = -Math.abs(numericAmount)
        
        const { error } = await supabase.from('transactions').insert({
            description: paymentMethod === 'pix' ? `Pix: ${description}` : description,
            amount: finalAmount,
            type: 'expense',
            date: date,
            category_id: categoryId,
            account_id: accountId,
            credit_card_id: paymentMethod === 'credit' ? selectedCardId : null,
            status: 'completed',
            observation: observation
        })
        if (error) throw error

        if (paymentMethod === 'credit') {
            // Crédito à vista: Consome limite
            const currentLimit = selectedCardData?.available_limit || 0
            await supabase.from('credit_cards').update({ available_limit: currentLimit - Math.abs(numericAmount) }).eq('id', selectedCardId)
        } else {
            // Débito ou Pix: Consome saldo da conta
            const { data: accData } = await supabase.from('accounts').select('current_balance').eq('id', accountId).single()
            const currentBalance = accData?.current_balance || 0
            await supabase.from('accounts').update({ current_balance: currentBalance + finalAmount }).eq('id', accountId)
        }
      }

      toast.success('Despesa registrada!')
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
    // Z-Index alto (70) para ficar acima do footer
    <div className="fixed inset-0 z-[70] flex items-end lg:items-center justify-center p-0 lg:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header Fixo no Topo do Modal */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-red-50 dark:bg-red-900/10 shrink-0 z-20">
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                Nova Despesa
            </h2>
            <button onClick={onClose} className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm"><X size={20} /></button>
        </div>

        {/* Conteúdo com Scroll - pb-28 para garantir que o último item não fique atrás do botão fixo */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 pb-28">
          
          {/* Valor */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Valor</label>
            <div className="relative mt-1">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-bold text-red-500">R$</span>
              <input 
                type="text" inputMode="numeric" value={amount} onChange={handleAmountChange} placeholder="0,00"
                className="w-full bg-transparent border-b-2 border-red-100 focus:border-red-500 py-2 pl-10 text-3xl font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-300"
                autoFocus
              />
            </div>
          </div>

          <input 
            type="text" placeholder="Descrição (ex: Supermercado)" value={description} onChange={e => setDescription(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500 outline-none"
          />

          {/* Conta e Método */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 ml-1">Conta</label>
                <div className="relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 pl-9 text-sm font-medium text-slate-700 dark:text-slate-200 appearance-none outline-none focus:ring-2 focus:ring-red-500">
                    <option value="" disabled>Selecionar conta</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
                </div>
            </div>

            {/* Seletor de Método (Crédito / Débito / Pix) */}
            {accountCards.length > 0 && (
                <div className="space-y-3 animate-in fade-in">
                    <div className="flex gap-2">
                        <button onClick={() => { setPaymentMethod('debit'); setIsInstallment(false); }} className={`flex-1 py-2 px-2 rounded-lg border text-xs sm:text-sm font-bold flex items-center justify-center gap-1 transition-all ${paymentMethod === 'debit' ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}><Wallet size={14} /> Débito</button>
                        <button onClick={() => { setPaymentMethod('pix'); setIsInstallment(false); }} className={`flex-1 py-2 px-2 rounded-lg border text-xs sm:text-sm font-bold flex items-center justify-center gap-1 transition-all ${paymentMethod === 'pix' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}><QrCode size={14} /> Pix</button>
                        <button onClick={() => setPaymentMethod('credit')} className={`flex-1 py-2 px-2 rounded-lg border text-xs sm:text-sm font-bold flex items-center justify-center gap-1 transition-all ${paymentMethod === 'credit' ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}><CreditCard size={14} /> Crédito</button>
                    </div>

                    {/* Opções de Crédito */}
                    {paymentMethod === 'credit' && (
                        <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-800/30 space-y-3 animate-in slide-in-from-top-2">
                            <select value={selectedCardId} onChange={e => setSelectedCardId(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-lg p-2 text-sm font-bold text-purple-900 dark:text-purple-100 outline-none">
                                <option value="" disabled>Escolher cartão...</option>
                                {accountCards.map(card => (
                                    <option key={card.id} value={card.id}>
                                        {card.name} (Disp: R$ {card.available_limit})
                                    </option>
                                ))}
                            </select>

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2"><Layers size={16}/> Parcelar?</span>
                                <button onClick={() => setIsInstallment(!isInstallment)} className={`w-10 h-5 rounded-full p-0.5 transition-colors ${isInstallment ? 'bg-purple-600' : 'bg-slate-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isInstallment ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                            </div>

                            {isInstallment && (
                                <div className="flex gap-2 mt-1 animate-in slide-in-from-top-1">
                                    <input type="number" min="2" max="36" value={installments} onChange={e => setInstallments(e.target.value)} className="w-20 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-lg p-2 text-center font-bold outline-none" />
                                    <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-900 rounded-lg border border-purple-200 dark:border-purple-800 text-xs text-purple-800 dark:text-purple-200 font-medium">
                                        {installments}x de {amount ? (parseFloat(amount.replace(/\./g, '').replace(',', '.'))/installments).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : 'R$ 0,00'}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 ml-1">Categoria</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 pl-9 text-sm font-medium text-slate-700 dark:text-slate-200 appearance-none outline-none focus:ring-2 focus:ring-red-500">
                  <option value="" disabled>Selecionar</option>
                  {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 ml-1">Data</label>
              <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 pl-9 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-500" /></div>
            </div>
          </div>

          {/* Observação */}
          <div>
             <label className="text-xs font-bold text-slate-500 ml-1">Observação (Opcional)</label>
             <div className="relative">
                <FileText className="absolute left-3 top-3 text-slate-400" size={16} />
                <textarea 
                    value={observation}
                    onChange={e => setObservation(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 pl-9 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
             </div>
          </div>
        </div>

        {/* Footer Fixo com Botão de Confirmar */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 z-20 pb-safe">
            <button onClick={handleSubmit} disabled={loading} className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70">
                {loading ? <Loader2 className="animate-spin" /> : <>Confirmar Despesa <Check size={20} /></>}
            </button>
        </div>

      </motion.div>
    </div>
  )
}
