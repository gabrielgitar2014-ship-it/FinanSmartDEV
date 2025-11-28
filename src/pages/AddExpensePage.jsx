import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, Check, Loader2, Calendar, Tag, Wallet, CreditCard, Layers, FileText, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { addMonths, getDate, isAfter, startOfDay, parseISO } from 'date-fns'

import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useAccounts } from '../hooks/useAccounts'
import { useCategories } from '../hooks/useCategories'

export default function AddExpensePage() {
  const navigate = useNavigate()
  const { accounts } = useAccounts()
  const { categories } = useCategories()

  // Estados
  const [paymentMethod, setPaymentMethod] = useState('debit') 
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [observation, setObservation] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [selectedCardId, setSelectedCardId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  
  const [isInstallment, setIsInstallment] = useState(false)
  const [installments, setInstallments] = useState(2)

  const [accountCards, setAccountCards] = useState([])
  const [selectedCardData, setSelectedCardData] = useState(null)
  const [loading, setLoading] = useState(false)

  const filteredCategories = categories.filter(c => c.type === 'expense')

  // Busca cartões
  useEffect(() => {
    if (accountId) {
      const fetchCards = async () => {
        const { data } = await supabase
          .from('credit_cards')
          .select('id, name, available_limit, closing_day')
          .eq('account_id', accountId)
        
        setAccountCards(data || [])
        if (data && data.length > 0) setPaymentMethod('credit')
        else setPaymentMethod('debit')
      }
      fetchCards()
    } else {
      setAccountCards([])
    }
  }, [accountId])

  useEffect(() => {
    if (selectedCardId) setSelectedCardData(accountCards.find(c => c.id === selectedCardId))
    else setSelectedCardData(null)
  }, [selectedCardId, accountCards])

  const handleSubmit = async () => {
    if (!amount || !description || !categoryId || !accountId) return toast.error('Preencha os campos obrigatórios')
    if (paymentMethod === 'credit' && !selectedCardId) return toast.error('Selecione o cartão')

    setLoading(true)
    try {
      const numericAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'))
      if (isNaN(numericAmount) || numericAmount <= 0) throw new Error("Valor inválido")

      // Datas
      let baseDate = new Date(date + 'T12:00:00')
      let startMonthOffset = 0

      // Verifica Futuro (Lógica crucial para não descontar saldo antes da hora)
      const isFuture = isAfter(startOfDay(parseISO(date)), startOfDay(new Date()))

      if (paymentMethod === 'credit' && selectedCardData?.closing_day) {
        const purchaseDay = getDate(baseDate)
        if (purchaseDay >= selectedCardData.closing_day) startMonthOffset = 1
      }

      // ID de grupo para parcelamento
      const installmentId = isInstallment ? crypto.randomUUID() : null

      if (isInstallment && paymentMethod === 'credit') {
        // --- PARCELADO ---
        const installmentValue = numericAmount / installments
        const transactionsToInsert = []
        
        for (let i = 0; i < installments; i++) {
            const installmentDate = addMonths(baseDate, i + startMonthOffset)
            transactionsToInsert.push({
                description: `${description} (${i + 1}/${installments})`,
                amount: -Math.abs(installmentValue),
                type: 'expense',
                date: installmentDate.toISOString().split('T')[0],
                category_id: categoryId,
                account_id: accountId,
                credit_card_id: selectedCardId,
                status: 'completed', // Compra confirmada
                installment_number: i + 1,
                installment_total: installments,
                installment_id: installmentId, // Vínculo
                observation: observation
            })
        }

        const { error } = await supabase.from('transactions').insert(transactionsToInsert)
        if (error) throw error

        // Atualiza Limite (SÓ SE NÃO FOR FUTURO)
        // No cartão, normalmente o limite é travado na hora, mesmo agendado.
        // Mas seguindo sua regra de "meses", vamos manter: futuro não mexe.
        if (!isFuture) {
            const currentLimit = parseFloat(selectedCardData?.available_limit || 0)
            await supabase.from('credit_cards')
              .update({ available_limit: currentLimit - numericAmount })
              .eq('id', selectedCardId)
        }

      } else {
        // --- À VISTA ---
        const finalAmount = -Math.abs(numericAmount)

        // ⚠️ NOVA LÓGICA: ajustar a DATA da transação à vista no crédito
        // Se for crédito e houver closing_day, usamos a regra:
        // compra >= dia de fechamento → cai na fatura do próximo mês
        let transactionDate = date // padrão: data escolhida pelo usuário

        if (paymentMethod === 'credit' && selectedCardData?.closing_day) {
          const purchaseDay = getDate(baseDate)

          if (purchaseDay >= selectedCardData.closing_day) {
            const adjusted = addMonths(baseDate, 1)
            transactionDate = adjusted.toISOString().split('T')[0]
          } else {
            // antes do fechamento, fica na mesma fatura, mas garantimos o formato
            transactionDate = baseDate.toISOString().split('T')[0]
          }
        }

        const { error } = await supabase.from('transactions').insert({
            description: description,
            amount: finalAmount,
            type: 'expense',
            date: transactionDate, // << usa a data ajustada
            category_id: categoryId,
            account_id: accountId,
            credit_card_id: paymentMethod === 'credit' ? selectedCardId : null,
            status: 'completed',
            observation: observation
        })
        if (error) throw error

        // Atualiza Saldo/Limite (SÓ SE NÃO FOR FUTURO)
        if (!isFuture) {
            if (paymentMethod === 'credit') {
                const currentLimit = parseFloat(selectedCardData?.available_limit || 0)
                await supabase.from('credit_cards')
                  .update({ available_limit: currentLimit - numericAmount })
                  .eq('id', selectedCardId)
            } else {
                const { data: accData } = await supabase
                  .from('accounts')
                  .select('current_balance')
                  .eq('id', accountId)
                  .single()
                const currentBalance = parseFloat(accData?.current_balance || 0)
                await supabase.from('accounts')
                  .update({ current_balance: currentBalance + finalAmount })
                  .eq('id', accountId)
            }
        }
      }

      toast.success(isFuture ? 'Despesa agendada!' : 'Despesa registrada!')
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
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Nova Despesa</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
          
          {/* Valor */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Valor</label>
            <div className="relative mt-1">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-bold text-red-500">R$</span>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0,00"
                className="w-full bg-transparent border-b-2 border-red-100 focus:border-red-500 py-2 pl-10 text-4xl font-bold text-slate-900 dark:text-white outline-none"
                autoFocus
              />
            </div>
          </div>

          <input
            type="text"
            placeholder="Descrição (ex: Mercado)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-lg font-medium outline-none focus:ring-2 focus:ring-red-500"
          />

          {/* Conta e Método */}
          <div className="space-y-4">
             <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Conta</label>
                  <div className="relative mt-1">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                      value={accountId}
                      onChange={e => setAccountId(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pl-10 font-bold text-slate-700 dark:text-slate-200 appearance-none outline-none focus:ring-2 focus:ring-red-500 h-[50px]"
                    >
                      <option value="" disabled>Selecionar...</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {accountCards.length > 0 && (
                   <div className="space-y-3 animate-in fade-in">
                      <div className="flex gap-2 p-1 bg-slate-200 dark:bg-slate-800 rounded-xl">
                          <button
                            onClick={() => { setPaymentMethod('debit'); setIsInstallment(false); }}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                              paymentMethod === 'debit'
                                ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm'
                                : 'text-slate-500'
                            }`}
                          >
                            Débito
                          </button>
                          <button
                            onClick={() => setPaymentMethod('credit')}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                              paymentMethod === 'credit'
                                ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm'
                                : 'text-slate-500'
                            }`}
                          >
                            Crédito
                          </button>
                      </div>

                      {paymentMethod === 'credit' && (
                          <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-2xl border border-purple-100 dark:border-purple-800/30 space-y-4">
                              <div>
                                <label className="text-[10px] font-bold text-purple-600 uppercase">Cartão</label>
                                <select
                                  value={selectedCardId}
                                  onChange={e => setSelectedCardId(e.target.value)}
                                  className="w-full mt-1 bg-white dark:bg-slate-900 border-0 rounded-xl p-3 font-bold text-purple-900 dark:text-purple-100 outline-none ring-1 ring-purple-200 dark:ring-purple-800"
                                >
                                  <option value="" disabled>Escolher...</option>
                                  {accountCards.map(card => (
                                    <option key={card.id} value={card.id}>
                                      {card.name} (R$ {card.available_limit})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                                    <Layers size={16}/> Parcelado?
                                  </span>
                                  <button
                                    onClick={() => setIsInstallment(!isInstallment)}
                                    className={`w-12 h-7 rounded-full p-1 transition-colors ${
                                      isInstallment ? 'bg-purple-600' : 'bg-slate-300'
                                    }`}
                                  >
                                    <div
                                      className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                                        isInstallment ? 'translate-x-5' : 'translate-x-0'
                                      }`}
                                    />
                                  </button>
                              </div>

                              {isInstallment && (
                                  <div className="flex gap-3 mt-1 animate-in slide-in-from-top-2">
                                      <input
                                        type="number"
                                        min="2"
                                        max="36"
                                        value={installments}
                                        onChange={e => setInstallments(e.target.value)}
                                        className="w-20 bg-white dark:bg-slate-900 rounded-xl p-3 text-center font-bold outline-none ring-1 ring-purple-200"
                                      />
                                      <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-900 rounded-xl text-xs text-purple-800 dark:text-purple-200 font-bold border border-purple-100 dark:border-purple-800/50">
                                          {installments}x de{' '}
                                          {amount
                                            ? (parseFloat(amount.replace(/\./g, '').replace(',', '.'))/installments)
                                                .toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})
                                            : 'R$ 0,00'}
                                      </div>
                                  </div>
                              )}
                          </div>
                      )}
                   </div>
                )}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Categoria</label>
              <div className="relative mt-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pl-9 font-medium text-slate-700 dark:text-slate-200 appearance-none outline-none focus:ring-2 focus:ring-red-500 h-[50px]"
                >
                  <option value="" disabled>Selecionar</option>
                  {filteredCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Data</label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pl-9 font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-500 h-[50px]"
                />
              </div>
            </div>
          </div>

          <div>
             <label className="text-xs font-bold text-slate-500 uppercase ml-1">Observação</label>
             <div className="relative mt-1">
                <FileText className="absolute left-3 top-3 text-slate-400" size={16} />
                <textarea
                  value={observation}
                  onChange={e => setObservation(e.target.value)}
                  rows={3}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pl-9 font-medium outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
             </div>
          </div>
      </div>

      {/* FOOTER FIXO */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-30">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-red-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70"
        >
            {loading ? <Loader2 className="animate-spin" /> : <>Confirmar <Check size={20} /></>}
        </button>
      </div>

    </div>
  )
}
