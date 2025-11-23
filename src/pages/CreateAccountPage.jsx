import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, Search, Wallet, Check, CreditCard, 
  TrendingUp, Key, Plus, Trash2, DollarSign, Loader2, X, Globe 
} from 'lucide-react'
import { toast } from 'sonner'

import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { BANKS } from '../constants/banks'
import { CURRENCIES } from '../constants/currencies'

export default function CreateAccountPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()
  
  // --- ESTADOS ---
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Dados Gerais
  const [selectedBank, setSelectedBank] = useState(null)
  const [accountName, setAccountName] = useState('')
  const [currency, setCurrency] = useState('BRL')
  
  // Módulo Conta Corrente
  const [hasChecking, setHasChecking] = useState(true)
  const [balanceDisplay, setBalanceDisplay] = useState('') // Valor Conta Corrente
  
  // Módulo Investimentos (NOVO)
  const [hasInvestments, setHasInvestments] = useState(false)
  const [investDisplay, setInvestDisplay] = useState('') // Valor Investido
  
  // Módulo Cartões
  const [hasCredit, setHasCredit] = useState(false)
  const [cards, setCards] = useState([]) 
  const [newCard, setNewCard] = useState({ name: '', limit: '', closing: '', due: '' })
  const [isAddingCard, setIsAddingCard] = useState(false)

  // Módulo Pix
  const [pixKeys, setPixKeys] = useState([])
  const [newPixKey, setNewPixKey] = useState('')
  const [newPixType, setNewPixType] = useState('cpf')

  const filteredBanks = BANKS.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const userCurrencies = profile?.currency || ['BRL']
  const availableCurrencies = CURRENCIES.filter(c => userCurrencies.includes(c.code) || c.code === 'BRL')

  const getCurrencySymbol = (code) => {
    return CURRENCIES.find(c => c.code === code)?.symbol || '$'
  }

  // --- EFEITO: DETECTAR PRÉ-SELEÇÃO ---
  useEffect(() => {
    if (location.state?.preSelectedBankId) {
      const bank = BANKS.find(b => b.id === location.state.preSelectedBankId)
      if (bank) handleSelectBank(bank)
    }
  }, [location.state])

  // --- HANDLERS ---

  const handleSelectBank = (bank) => {
    setSelectedBank(bank)
    setAccountName(bank.name)
    setNewCard(prev => ({ ...prev, name: `${bank.name} Card` }))
    setStep(2)
  }

  // Lógica de Input Monetário (Genérico)
  const formatCurrencyInput = (value) => {
    const rawValue = value.replace(/\D/g, '')
    if (!rawValue) return ''
    const amount = parseFloat(rawValue) / 100
    return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  }

  const parseCurrencyInput = (displayValue) => {
    if (!displayValue) return 0
    return parseFloat(displayValue.replace(/\./g, '').replace(',', '.'))
  }

  // Handlers específicos para cada input
  const handleCheckingChange = (e) => setBalanceDisplay(formatCurrencyInput(e.target.value))
  const handleInvestChange = (e) => setInvestDisplay(formatCurrencyInput(e.target.value))


  // --- LOGICA CARTÕES ---
  const handleAddCardToList = () => {
    if (!newCard.name || !newCard.limit || !newCard.closing || !newCard.due) {
      return toast.error('Preencha todos os dados do cartão')
    }
    setCards([...cards, { ...newCard, id: Date.now() }])
    setNewCard({ name: '', limit: '', closing: '', due: '' })
    setIsAddingCard(false)
  }

  const handleRemoveCardFromList = (id) => {
    setCards(cards.filter(c => c.id !== id))
  }

  // --- LOGICA PIX ---
  const handleAddPix = () => {
    if (!newPixKey) return
    setPixKeys([...pixKeys, { type: newPixType, key: newPixKey }])
    setNewPixKey('')
  }

  const handleRemovePix = (index) => {
    setPixKeys(pixKeys.filter((_, i) => i !== index))
  }

  // --- SALVAR TUDO ---
 const handleCreate = async () => {
    if (!accountName) return toast.error('Nome da conta é obrigatório')
    
    // Valida Cartão
    if (hasCredit) {
        if (!cardData.limit || !cardData.closing || !cardData.due) {
            return toast.error('Preencha os dados do cartão')
        }
    }

    setLoading(true)
    try {
      // Household ID
      const { data: memberData } = await supabase.from('household_members').select('household_id').eq('user_id', user.id).maybeSingle()
      
      // Separa os saldos
      const checkingValue = hasChecking ? parseCurrencyInput(balanceDisplay) : 0
      const investValue = hasInvestments ? parseCurrencyInput(investDisplay) : 0

      // 2. Criar CONTA (Agora salvando investment_balance separado)
      const { data: accountData, error: accError } = await supabase
        .from('accounts')
        .insert({
          user_id: user.id,
          household_id: memberData?.household_id,
          name: accountName,
          bank_slug: selectedBank.id,
          color: selectedBank.color,
          
          initial_balance: checkingValue,   // Histórico
          current_balance: checkingValue,   // Saldo Disponível
          investment_balance: investValue,  // <--- NOVO: Saldo Investido
          
          type: hasInvestments && hasChecking ? 'investment_hub' : (hasInvestments ? 'investment' : 'checking'),
          has_investments: hasInvestments,
          pix_keys: pixKeys,
          currency_code: currency,
          is_archived: false
        })
        .select()
        .single()

      if (accError) throw accError

      // 3. Criar Cartão (Com available_limit)
      if (hasCredit && accountData) {
        const limitValue = parseFloat(cardData.limit.replace(',', '.') || 0)
        
        const { error: cardError } = await supabase.from('credit_cards').insert({
          account_id: accountData.id,
          name: cardData.name,
          limit_amount: limitValue,
          available_limit: limitValue, // <--- CORREÇÃO: Inicializa disponível igual ao total
          closing_day: parseInt(cardData.closing),
          due_day: parseInt(cardData.due),
          last_4_digits: '****'
        })
        
        if (cardError) throw cardError
      }

      toast.success('Conexão criada com sucesso!')
      navigate('/accounts')

    } catch (err) {
      console.error(err)
      toast.error('Erro ao criar conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-40 animate-in fade-in duration-500 relative">
      
      {/* HEADER MINIMALISTA */}
      <div className="fixed top-4 left-4 z-50">
        <button 
          onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} 
          className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-full shadow-md border border-slate-200 dark:border-slate-700 transition-transform active:scale-95 text-slate-600 dark:text-slate-300"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-4 pt-20">
        
        <AnimatePresence mode="wait">
          
          {/* === PASSO 1: ESCOLHER BANCO === */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="space-y-2 px-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Nova Conexão</h2>
                <p className="text-slate-500">Selecione a instituição financeira.</p>
              </div>

              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Buscar banco..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {filteredBanks.map(bank => (
                  <button 
                    key={bank.id}
                    onClick={() => handleSelectBank(bank)}
                    className="flex flex-col items-center gap-3 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 shadow-sm hover:shadow-md transition-all aspect-square justify-center active:scale-95"
                  >
                    <div className="w-12 h-12 relative flex items-center justify-center">
                      {bank.logo ? (
                          <img src={bank.logo} className="w-full h-full object-contain" onError={(e) => { e.target.onerror = null; e.target.src = '/logos/vite.svg' }} />
                      ) : (
                          <Wallet className="text-slate-300" size={32} />
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 text-center line-clamp-2">{bank.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* === PASSO 2: CONFIGURAÇÃO === */}
          {step === 2 && selectedBank && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Header Instituição */}
              <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="w-12 h-12 p-1 bg-white rounded-xl border border-slate-100 flex items-center justify-center">
                   {selectedBank.logo ? <img src={selectedBank.logo} className="w-full h-full object-contain" /> : <Wallet />}
                </div>
                <div className="flex-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Nome da Conexão</label>
                   <input 
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full bg-transparent font-bold text-lg text-slate-900 dark:text-white outline-none placeholder:text-slate-300"
                    placeholder="Nome da conta"
                   />
                </div>
                <div className="relative">
                    <Globe className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                    <select 
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 pl-7 pr-2 text-xs font-bold outline-none appearance-none"
                    >
                        {availableCurrencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-500 uppercase ml-1">Serviços Ativos</h3>

              {/* --- MÓDULO 1: CONTA CORRENTE --- */}
              <div className={`p-5 rounded-3xl border-2 transition-all ${hasChecking ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-md' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-70'}`}>
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setHasChecking(!hasChecking)}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${hasChecking ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}><DollarSign size={20} /></div>
                        <span className="font-bold text-slate-900 dark:text-white">Conta Corrente / Saldo</span>
                    </div>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${hasChecking ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${hasChecking ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                </div>
                
                <AnimatePresence>
                    {hasChecking && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <label className="text-xs font-bold text-slate-500 uppercase">Saldo Atual</label>
                                <div className="relative mt-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                                        {getCurrencySymbol(currency)}
                                    </span>
                                    <input 
                                        type="text" inputMode="numeric" placeholder="0,00" 
                                        value={balanceDisplay} onChange={handleCheckingChange}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pl-12 text-xl font-mono font-bold outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
              </div>

              {/* --- MÓDULO 2: INVESTIMENTOS (AGORA COM INPUT) --- */}
              <div className={`p-5 rounded-3xl border-2 transition-all ${hasInvestments ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-md' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-70'}`}>
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setHasInvestments(!hasInvestments)}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${hasInvestments ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}><TrendingUp size={20} /></div>
                        <span className="font-bold text-slate-900 dark:text-white">Investimentos</span>
                    </div>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${hasInvestments ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${hasInvestments ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                </div>
                
                {/* Input de Investimentos (Expandível) */}
                <AnimatePresence>
                    {hasInvestments && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <label className="text-xs font-bold text-slate-500 uppercase">Total Investido</label>
                                <div className="relative mt-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                                        {getCurrencySymbol(currency)}
                                    </span>
                                    <input 
                                        type="text" inputMode="numeric" placeholder="0,00" 
                                        value={investDisplay} onChange={handleInvestChange}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pl-12 text-xl font-mono font-bold outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
              </div>

              {/* --- MÓDULO 3: CARTÕES DE CRÉDITO --- */}
              <div className={`p-5 rounded-3xl border-2 transition-all ${hasCredit ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-md' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-70'}`}>
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setHasCredit(!hasCredit)}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${hasCredit ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}><CreditCard size={20} /></div>
                        <span className="font-bold text-slate-900 dark:text-white">Cartões de Crédito</span>
                    </div>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${hasCredit ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${hasCredit ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                </div>

                <AnimatePresence>
                    {hasCredit && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                {cards.map(card => (
                                    <div key={card.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <div><p className="font-bold text-sm text-slate-900 dark:text-white">{card.name}</p><p className="text-xs text-slate-500">R$ {card.limit}</p></div>
                                        <button onClick={() => handleRemoveCardFromList(card.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                                    </div>
                                ))}

                                {isAddingCard ? (
                                    <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 space-y-3">
                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-indigo-600 uppercase">Novo Cartão</span><button onClick={() => setIsAddingCard(false)}><X size={16} className="text-indigo-400" /></button></div>
                                        <input placeholder="Nome (ex: Black)" value={newCard.name} onChange={e => setNewCard({...newCard, name: e.target.value})} className="w-full bg-white dark:bg-slate-900 p-2 rounded-lg text-sm outline-none" />
                                        <div className="grid grid-cols-3 gap-2">
                                            <input type="number" placeholder="Limite" value={newCard.limit} onChange={e => setNewCard({...newCard, limit: e.target.value})} className="w-full bg-white dark:bg-slate-900 p-2 rounded-lg text-sm outline-none" />
                                            <input type="number" placeholder="Fech." value={newCard.closing} onChange={e => setNewCard({...newCard, closing: e.target.value})} className="w-full bg-white dark:bg-slate-900 p-2 rounded-lg text-sm outline-none" />
                                            <input type="number" placeholder="Venc." value={newCard.due} onChange={e => setNewCard({...newCard, due: e.target.value})} className="w-full bg-white dark:bg-slate-900 p-2 rounded-lg text-sm outline-none" />
                                        </div>
                                        <button onClick={handleAddCardToList} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm">Adicionar à lista</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsAddingCard(true)} className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 font-bold text-sm hover:border-indigo-500 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2"><Plus size={16} /> Adicionar Cartão</button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
              </div>

              {/* --- MÓDULO 4: PIX --- */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400"><Key size={20} /></div><span className="font-bold text-slate-900 dark:text-white">Minhas Chaves Pix</span></div>
                <div className="space-y-3">{pixKeys.map((pix, index) => (<div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800"><div><span className="text-[10px] uppercase font-bold text-slate-400">{pix.type}</span><p className="text-sm font-medium text-slate-900 dark:text-white">{pix.key}</p></div><button onClick={() => handleRemovePix(index)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button></div>))}<div className="flex gap-2"><select value={newPixType} onChange={e => setNewPixType(e.target.value)} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 text-xs font-bold outline-none"><option value="cpf">CPF</option><option value="email">Email</option><option value="phone">Celular</option><option value="random">Aleatória</option></select><input value={newPixKey} onChange={e => setNewPixKey(e.target.value)} placeholder="Nova chave..." className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm outline-none" /><button onClick={handleAddPix} className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl"><Plus size={18} /></button></div></div>
              </div>

              <div className="pt-8 pb-20">
                <button onClick={handleCreate} disabled={loading} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-lg shadow-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-70">
                  {loading ? <Loader2 className="animate-spin" /> : <>Concluir Conexão <Check /></>}
                </button>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}