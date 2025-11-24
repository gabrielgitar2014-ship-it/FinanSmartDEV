import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, CreditCard, Plus, MoreVertical, Wallet, TrendingUp, Calendar, Trash2, Key, DollarSign, X, Loader2, Check 
} from 'lucide-react'
import { toast } from 'sonner'

import { useAccountDetails } from '../hooks/useAccountDetails'
import { getBankBySlug } from '../constants/banks'
import { CURRENCIES } from '../constants/currencies'
import { useUIStore } from '../store/useUIStore'
import { supabase } from '../lib/supabaseClient'

import AddCardModal from '../components/AddCardModal'
import EditAccountModal from '../components/EditAccountModal'
import BalanceModal from '../components/BalanceModal'

export default function AccountDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { account, creditCards, loading, error, createCard, deleteCard, refetch } = useAccountDetails(id)
  const { showValues } = useUIStore()
  
  const [activeTab, setActiveTab] = useState('overview')
  const [isCardModalOpen, setIsCardModalOpen] = useState(false)
  
  const [isAddingPix, setIsAddingPix] = useState(false)
  const [newPix, setNewPix] = useState({ type: 'cpf', key: '' })
  const [isAddingInvest, setIsAddingInvest] = useState(false)
  const [newInvestAmount, setNewInvestAmount] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>
  if (error || !account) return <div className="p-8 text-center text-red-500">Erro ao carregar conta.</div>

  const bankVisuals = getBankBySlug(account.bank_slug)
  const currencySymbol = CURRENCIES.find(c => c.code === account.currency_code)?.symbol || '$'
  
  const formatCurrency = (val) => {
    if (!showValues) return '••••••'
    const currency = CURRENCIES.find(c => c.code === account.currency_code) || CURRENCIES[0]
    return new Intl.NumberFormat(currency.locale, { style: 'currency', currency: currency.code }).format(val || 0)
  }

  const handleDeleteCard = async (cardId) => {
    if(!window.confirm('Excluir este cartão?')) return
    const res = await deleteCard(cardId)
    if(res.success) toast.success('Cartão removido')
    else toast.error('Erro ao remover')
  }

  const handleAddPix = async () => {
    if (!newPix.key) return toast.error('Digite a chave')
    setActionLoading(true)
    try {
      const currentKeys = account.pix_keys || []
      const updatedKeys = [...currentKeys, newPix]
      const { error } = await supabase.from('accounts').update({ pix_keys: updatedKeys }).eq('id', account.id)
      if (error) throw error
      toast.success('Chave Pix adicionada!')
      setNewPix({ type: 'cpf', key: '' })
      setIsAddingPix(false)
      refetch()
    } catch (err) { toast.error('Erro ao salvar chave.') } 
    finally { setActionLoading(false) }
  }

  const handleRemovePix = async (indexToRemove) => {
    if (!window.confirm('Remover esta chave?')) return
    const updatedKeys = account.pix_keys.filter((_, i) => i !== indexToRemove)
    await supabase.from('accounts').update({ pix_keys: updatedKeys }).eq('id', account.id)
    refetch()
  }

  const handleAddInvestment = async () => {
    if (!newInvestAmount) return toast.error('Digite o valor')
    setActionLoading(true)
    try {
      const numericAmount = parseFloat(newInvestAmount.replace(',', '.') || 0)
      const currentInvest = parseFloat(account.investment_balance || 0)
      const newTotal = currentInvest + numericAmount
      const { error } = await supabase.from('accounts').update({ investment_balance: newTotal, has_investments: true, type: account.type === 'checking' ? 'investment_hub' : account.type }).eq('id', account.id)
      if (error) throw error
      toast.success('Investimento atualizado!')
      setNewInvestAmount('')
      setIsAddingInvest(false)
      refetch()
    } catch (err) { toast.error('Erro ao atualizar investimento.') } 
    finally { setActionLoading(false) }
  }

  return (
    <div className="pb-28 lg:pb-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="flex items-center justify-between px-2 py-4 sticky top-0 z-20 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md">
        <button onClick={() => navigate('/accounts')} className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-500 hover:text-indigo-600 shadow-sm transition-colors"><ChevronLeft size={20} /></button>
        <h1 className="font-bold text-slate-900 dark:text-white text-lg">{account.name}</h1>
        <button className="p-2 text-slate-400 hover:text-slate-600"><MoreVertical size={20} /></button>
      </div>

      {/* HERO CARD */}
      <div className="px-2">
        <div className="relative w-full min-h-[200px] rounded-[2rem] p-6 text-white shadow-2xl overflow-hidden flex flex-col justify-between transition-all" style={{ backgroundColor: bankVisuals.color, color: bankVisuals.textColor || '#fff' }}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-2xl p-1 shadow-md">
                <img src={bankVisuals.logo || '/logos/vite.svg'} alt={bankVisuals.name} className="w-full h-full object-contain" onError={(e) => { e.target.onerror = null; e.target.src = '/logos/vite.svg' }} />
              </div>
              <div><p className="text-xs opacity-80 uppercase font-bold tracking-wider">Instituição</p><h2 className="font-bold text-lg leading-tight">{bankVisuals.name}</h2></div>
            </div>
            <div className="opacity-50">{account.type === 'investment' ? <TrendingUp size={28} /> : <Wallet size={28} />}</div>
          </div>
          <div className="relative z-10 mt-6 space-y-4">
            <div><p className="text-sm opacity-80 mb-1 font-medium">{account.type === 'investment' ? 'Total Investido' : 'Saldo Disponível'}</p><div className="text-4xl font-mono font-bold tracking-tight">{showValues ? formatCurrency(account.current_balance) : '••••••'}</div></div>
            {(account.type === 'investment_hub' || (account.investment_balance > 0 && account.type !== 'investment')) && (<div className="pt-4 border-t border-white/20 flex items-center gap-2"><TrendingUp size={16} className="opacity-80" /><span className="text-sm font-medium opacity-80">Investido:</span><span className="text-sm font-mono font-bold">{formatCurrency(account.investment_balance)}</span></div>)}
          </div>
        </div>
      </div>

      {/* ABAS */}
      <div className="px-4 mt-6 mb-4">
        <div className="flex p-1 bg-slate-200 dark:bg-slate-900 rounded-xl">
            {[{ id: 'overview', label: 'Cartões', icon: CreditCard }, { id: 'pix', label: 'Pix', icon: Key }, { id: 'invest', label: 'Investimentos', icon: TrendingUp }].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}><tab.icon size={14} /> {tab.label}</button>
            ))}
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="px-4 pb-20">
        
        {/* 1. CARTÕES (Com Lógica de Consumo) */}
        {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">Cartões de Crédito</h3>
                    <span className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-full text-slate-600 dark:text-slate-300">{creditCards.length}</span>
                </div>
                
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x">
                    <button onClick={() => setIsCardModalOpen(true)} className="min-w-[140px] h-[200px] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all snap-center shrink-0"><div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center"><Plus size={24} /></div><span className="text-xs font-bold">Novo Cartão</span></button>
                    
                    {creditCards.map(card => {
                        const limit = parseFloat(card.limit_amount || 0)
                        const available = parseFloat(card.available_limit || 0)
                        const used = limit - available
                        const percentage = limit > 0 ? (used / limit) * 100 : 0

                        return (
                            <div
                              key={card.id}
                              onClick={() => navigate(`/cards/${card.id}`)}
                              className="min-w-[300px] h-[200px] bg-slate-900 text-white rounded-2xl p-5 shadow-lg flex flex-col justify-between relative overflow-hidden snap-center group shrink-0"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div className="flex items-center gap-2"><div className="w-8 h-5 bg-white/20 rounded flex items-center justify-center text-[8px] font-bold tracking-widest">CHIP</div><span className="text-xs opacity-70">Final {card.last_4_digits || '****'}</span></div>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id) }} className="p-1.5 bg-white/10 rounded-full hover:bg-red-500 hover:text-white text-slate-300 transition-colors"><Trash2 size={14}/></button>
                                </div>

                                <div className="relative z-10">
                                    <div className="flex justify-between text-xs mb-1 opacity-80">
                                        <span>Fatura Atual</span>
                                        <span>{Math.round(percentage)}%</span>
                                    </div>
                                    <p className="font-mono text-xl font-bold tracking-tight">{formatCurrency(used)}</p>
                                    {/* Barra de Progresso */}
                                    <div className="w-full h-1.5 bg-white/20 rounded-full mt-2 overflow-hidden">
                                        <div className={`h-full rounded-full ${percentage > 90 ? 'bg-red-500' : 'bg-emerald-400'}`} style={{ width: `${percentage}%` }} />
                                    </div>
                                </div>

                                <div className="flex justify-between items-end relative z-10">
                                    <div><p className="text-[10px] opacity-60 uppercase">Nome</p><p className="text-sm font-bold truncate max-w-[120px]">{card.name}</p></div>
                                    <div className="text-right"><p className="text-[10px] opacity-60 uppercase">Disponível</p><p className="text-sm font-mono font-bold text-emerald-400">{formatCurrency(available)}</p></div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )}

        {/* 2. PIX */}
        {activeTab === 'pix' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center justify-between"><h3 className="font-bold text-slate-900 dark:text-white text-lg">Chaves Cadastradas</h3><button onClick={() => setIsAddingPix(!isAddingPix)} className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"><Plus size={14}/> Adicionar</button></div>
                <AnimatePresence>
                    {isAddingPix && (
                        <motion.div initial={{height: 0, opacity: 0}} animate={{height: 'auto', opacity: 1}} exit={{height: 0, opacity: 0}} className="overflow-hidden">
                            <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 mb-4 flex gap-2">
                                <select value={newPix.type} onChange={e => setNewPix({...newPix, type: e.target.value})} className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold outline-none p-2">
                                    <option value="cpf">CPF</option><option value="email">Email</option><option value="phone">Celular</option><option value="random">Aleatória</option>
                                </select>
                                <input value={newPix.key} onChange={e => setNewPix({...newPix, key: e.target.value})} placeholder="Chave..." className="flex-1 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg p-2 text-sm outline-none" />
                                <button onClick={handleAddPix} disabled={actionLoading} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700">{actionLoading ? <Loader2 className="animate-spin" size={16}/> : <Check size={16}/>}</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="space-y-2">{(account.pix_keys || []).length === 0 ? (<p className="text-center text-slate-400 py-8 text-sm">Nenhuma chave cadastrada.</p>) : ((account.pix_keys || []).map((pix, idx) => (<div key={idx} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center shadow-sm"><div><span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{pix.type}</span><p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1">{pix.key}</p></div><button onClick={() => handleRemovePix(idx)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button></div>)))}</div>
            </div>
        )}

        {/* 3. INVESTIMENTOS */}
        {activeTab === 'invest' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                 <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800 text-center"><p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-2">Total Investido nesta conta</p><p className="text-3xl font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(account.investment_balance)}</p></div>
                 {!isAddingInvest ? (<button onClick={() => setIsAddingInvest(true)} className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 font-bold flex items-center justify-center gap-2 hover:border-emerald-500 hover:text-emerald-600 transition-all"><Plus size={20} /> Registrar Aporte / Retirada</button>) : (<div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg"><div className="flex justify-between items-center mb-4"><h4 className="font-bold text-slate-700 dark:text-slate-300">Novo Aporte</h4><button onClick={() => setIsAddingInvest(false)}><X size={18} className="text-slate-400"/></button></div><div className="relative mb-4"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">{currencySymbol}</span><input type="number" placeholder="0.00" value={newInvestAmount} onChange={e => setNewInvestAmount(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pl-10 font-mono text-lg font-bold outline-none focus:ring-2 focus:ring-emerald-500" /></div><p className="text-xs text-slate-400 mb-4">Para retiradas, use valor negativo (ex: -500).</p><button onClick={handleAddInvestment} disabled={actionLoading} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors">{actionLoading ? <Loader2 className="animate-spin" /> : 'Atualizar Saldo Investido'}</button></div>)}
            </div>
        )}

      </div>

      <AnimatePresence>
        {isCardModalOpen && <AddCardModal isOpen={isCardModalOpen} onClose={() => setIsCardModalOpen(false)} onSave={createCard} bankSlug={account.bank_slug} />}
      </AnimatePresence>

    </div>
  )
}
