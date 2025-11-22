import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, CreditCard, Plus, MoreVertical, Wallet, TrendingUp, Calendar, Trash2,ShoppingBag 
} from 'lucide-react'
import { toast } from 'sonner'

import { useAccountDetails } from '../hooks/useAccountDetails'
import { getBankBySlug } from '../constants/banks'
import AddCardModal from '../components/AddCardModal' // <--- IMPORTAR MODAL

export default function AccountDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { account, creditCards, loading, error, createCard, deleteCard } = useAccountDetails(id)
  
  const [showBalance, setShowBalance] = useState(true)
  const [isCardModalOpen, setIsCardModalOpen] = useState(false) // <--- ESTADO MODAL

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
  if (error || !account) return <div className="p-8 text-center text-red-500">Erro ao carregar conta.</div>

  const bankVisuals = getBankBySlug(account.bank_slug)
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  // Função para excluir cartão
  const handleDeleteCard = async (cardId) => {
    if(!window.confirm('Excluir este cartão?')) return
    const res = await deleteCard(cardId)
    if(res.success) toast.success('Cartão removido')
    else toast.error('Erro ao remover')
  }

  return (
    <div className="pb-28 lg:pb-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="flex items-center justify-between px-2 py-4">
        <button onClick={() => navigate('/accounts')} className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-500 hover:text-indigo-600 shadow-sm transition-colors"><ChevronLeft size={20} /></button>
        <h1 className="font-bold text-slate-900 dark:text-white text-lg">Detalhes da Conta</h1>
        <button className="p-2 text-slate-400 hover:text-slate-600"><MoreVertical size={20} /></button>
      </div>

      {/* HERO CARD (BANCO) */}
      <div className="px-2">
        <div className="relative w-full h-56 rounded-[2rem] p-6 text-white shadow-2xl overflow-hidden flex flex-col justify-between" style={{ backgroundColor: bankVisuals.color, color: bankVisuals.textColor || '#fff' }}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-5 -mb-5 pointer-events-none"></div>
          
          <div className="relative z-10 flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-2xl p-1 shadow-md"><img src={bankVisuals.logo || '/logos/vite.svg'} alt={bankVisuals.name} className="w-full h-full object-contain" /></div>
              <div><p className="text-xs opacity-80 uppercase font-bold tracking-wider">Instituição</p><h2 className="font-bold text-lg leading-tight">{bankVisuals.name}</h2></div>
            </div>
            <Wallet className="opacity-50" size={28} />
          </div>
          <div className="relative z-10">
            <p className="text-sm opacity-80 mb-1 font-medium">Saldo em conta</p>
            <div className="text-4xl font-mono font-bold tracking-tight">{showBalance ? formatCurrency(account.current_balance) : '••••••'}</div>
          </div>
        </div>
      </div>

      {/* SEÇÃO CARTÕES */}
      <div className="mt-8 px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2"><CreditCard size={20} className="text-indigo-500" /> Cartões</h3>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">{creditCards.length} ativos</span>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x">
          
          {/* Botão Novo Cartão */}
          <button 
            onClick={() => setIsCardModalOpen(true)} // <--- ABRE MODAL
            className="min-w-[140px] h-[200px] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all snap-center shrink-0"
          >
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center"><Plus size={24} /></div>
            <span className="text-xs font-bold">Novo Cartão</span>
          </button>

          {/* Lista de Cartões */}
          {creditCards.map(card => (
            <div key={card.id} className="min-w-[300px] h-[200px] bg-slate-900 text-white rounded-2xl p-5 shadow-lg flex flex-col justify-between relative overflow-hidden snap-center group shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
              
              <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-5 bg-white/20 rounded flex items-center justify-center text-[8px] font-bold tracking-widest">CHIP</div>
                  <span className="text-xs opacity-70">Crédito</span>
                </div>
                {/* Botão Excluir Cartão */}
                <button onClick={() => handleDeleteCard(card.id)} className="p-1.5 bg-white/10 rounded-full hover:bg-red-500 hover:text-white text-slate-300 transition-colors"><Trash2 size={14}/></button>
              </div>

              <div className="relative z-10">
                <p className="font-mono text-lg tracking-widest opacity-90">•••• •••• •••• {card.last_4_digits || '0000'}</p>
              </div>

              <div className="flex justify-between items-end relative z-10">
                <div><p className="text-[10px] opacity-60 uppercase">Nome</p><p className="text-sm font-bold truncate max-w-[150px]">{card.name}</p></div>
                <div className="text-right"><p className="text-[10px] opacity-60 uppercase">Limite</p><p className="text-sm font-mono font-bold">{formatCurrency(card.limit_amount || 0)}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HISTÓRICO */}
      <div className="mt-6 px-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-4">Histórico da Conta</h3>
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-8 text-center border border-slate-100 dark:border-slate-800">
          <Calendar className="mx-auto text-slate-300 mb-3" size={32} />
          <p className="text-slate-500 text-sm">As transações desta conta aparecerão aqui.</p>
        </div>
      </div>

      {/* MODAL */}
      <AnimatePresence>
        {isCardModalOpen && (
          <AddCardModal 
            isOpen={isCardModalOpen} 
            onClose={() => setIsCardModalOpen(false)} 
            onSave={createCard}
            bankSlug={account.bank_slug} 
          />
        )}
      </AnimatePresence>

    </div>
  )

}
