import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Wallet, MoreHorizontal, Eye, EyeOff, Building2, RefreshCw, TrendingUp, Trash2, Edit2, DollarSign, Briefcase 
} from 'lucide-react'
import { toast } from 'sonner'

import { useAccounts } from '../hooks/useAccounts'
import { getBankBySlug } from '../constants/banks'
import { CURRENCIES } from '../constants/currencies'
import { supabase } from '../lib/supabaseClient'
import { useUIStore } from '../store/useUIStore'

import EditAccountModal from '../components/EditAccountModal'
import BalanceModal from '../components/BalanceModal'
import ConfirmationModal from '../components/ConfirmationModal'

export default function AccountsPage() {
  const navigate = useNavigate()
  const { accounts, loading, refetch, error, updateAccount } = useAccounts()
  const { showValues } = useUIStore()
  
  const [openMenuId, setOpenMenuId] = useState(null)
  
  // Estados de Modais de Ação (Edição/Exclusão)
  const [editingAccount, setEditingAccount] = useState(null)
  const [balancingAccount, setBalancingAccount] = useState(null)
  const [accountToDelete, setAccountToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Helper de Formatação Dinâmica (Moeda da Conta)
  const formatCurrency = (value, currencyCode = 'BRL') => {
    if (loading) return '...'
    if (!showValues) return '••••••'
    
    const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0]
    return new Intl.NumberFormat(currency.locale, { 
      style: 'currency', 
      currency: currency.code 
    }).format(value || 0)
  }

  // Determina qual saldo mostrar baseado no tipo da conta
  const getDisplayBalance = (acc) => {
    if (acc.type === 'investment') return acc.investment_balance
    return acc.current_balance
  }

  // --- HANDLERS ---
  const handleUpdateSave = async (id, updates) => {
    const result = await updateAccount(id, updates)
    if (result.success) toast.success('Conta atualizada!')
    else toast.error('Erro ao atualizar conta.')
  }

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return
    setIsDeleting(true)
    try {
      const { error } = await supabase.from('accounts').delete().eq('id', accountToDelete.id)
      if (error) throw error
      toast.success('Conta excluída com sucesso')
      refetch()
      setAccountToDelete(null)
    } catch (err) {
      toast.error('Erro ao excluir conta.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (error) return <div className="p-8 text-center text-red-500">Erro: {error}</div>

  return (
    <div className="pb-28 lg:pb-0 space-y-6 animate-in fade-in duration-500 min-h-[80vh]" onClick={() => setOpenMenuId(null)}>
      
      {/* HEADER */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Minhas Contas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie seus bancos e carteiras</p>
        </div>
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); refetch(); toast.info('Atualizando...') }} className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* GRID DE CARTÕES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* BOTÃO ADICIONAR (Navega para a página de criação) */}
        <button 
          onClick={() => navigate('/accounts/new')}
          className="group min-h-[180px] flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-95"
        >
          <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform shadow-sm">
            <Plus size={24} strokeWidth={3} />
          </div>
          <span className="font-semibold text-slate-600 dark:text-slate-300 text-sm">Nova Conexão</span>
        </button>

        {/* LISTA DE CONTAS */}
        {loading ? (
          [1, 2].map(i => <div key={i} className="h-[180px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-pulse" />)
        ) : (
          accounts.map((acc) => {
            const bankVisuals = getBankBySlug(acc.bank_slug)
            const isMenuOpen = openMenuId === acc.id
            const balance = getDisplayBalance(acc)
            
            return (
              <motion.div
                key={acc.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -4 }}
                onClick={() => navigate(`/accounts/${acc.id}`)}
                className="relative h-[180px] rounded-3xl p-6 shadow-lg flex flex-col justify-between overflow-visible text-white transition-all group z-0 hover:z-10 cursor-pointer"
                style={{ backgroundColor: bankVisuals.color, color: bankVisuals.textColor || '#fff' }}
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-white/20 transition-colors"></div>
                
                {/* Topo */}
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex items-center gap-2">
                    {bankVisuals.logo ? (
                      <img src={bankVisuals.logo} alt={bankVisuals.name} className="w-8 h-8 rounded-full bg-white p-0.5 object-contain shadow-sm" onError={(e) => { e.target.onerror = null; e.target.src = '/logos/vite.svg' }} />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/10"><Building2 size={16} className="text-current" /></div>
                    )}
                    <span className="font-medium text-sm opacity-90 tracking-wide text-shadow-sm">{bankVisuals.name}</span>
                  </div>
                  
                  {/* Menu */}
                  <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : acc.id) }} className="p-1 rounded-full hover:bg-white/20 transition-colors">
                      <MoreHorizontal size={20} className="opacity-80" />
                    </button>
                    <AnimatePresence>
                      {isMenuOpen && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-8 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 w-40 overflow-hidden z-50"
                        >
                          <button onClick={() => { setEditingAccount(acc); setOpenMenuId(null) }} className="w-full px-4 py-2.5 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><Edit2 size={14} /> Editar</button>
                          <button onClick={() => { setBalancingAccount(acc); setOpenMenuId(null) }} className="w-full px-4 py-2.5 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><DollarSign size={14} /> Ajustar Saldo</button>
                          <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                          <button onClick={() => { setAccountToDelete(acc); setOpenMenuId(null) }} className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"><Trash2 size={14} /> Excluir</button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Meio */}
                <div className="relative z-10 mt-2">
                  <p className="text-[10px] opacity-70 uppercase tracking-wider font-bold mb-0.5">
                    {acc.type === 'wallet' ? 'Carteira' : acc.type === 'investment' ? 'Investimentos' : 'Conta Corrente'}
                  </p>
                  <p className="font-semibold text-lg truncate pr-4 leading-tight">{acc.name}</p>
                </div>

                {/* Rodapé */}
                <div className="flex justify-between items-end relative z-10">
                  <div>
                    <p className="text-[10px] opacity-70 mb-0.5">Total acumulado</p>
                    <p className="text-xl font-mono font-bold tracking-tight">{formatCurrency(balance, acc.currency_code)}</p>
                  </div>
                  <div className="opacity-50">
                    {acc.type === 'investment' ? <TrendingUp size={24} /> : acc.type === 'wallet' ? <Briefcase size={24} /> : <Wallet size={24} />}
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Modais de Edição/Ajuste */}
      <AnimatePresence>
        {editingAccount && <EditAccountModal isOpen={!!editingAccount} onClose={() => setEditingAccount(null)} account={editingAccount} onSave={handleUpdateSave} />}
        {balancingAccount && <BalanceModal isOpen={!!balancingAccount} onClose={() => setBalancingAccount(null)} account={balancingAccount} onSave={handleUpdateSave} />}
        {accountToDelete && <ConfirmationModal isOpen={!!accountToDelete} onClose={() => setAccountToDelete(null)} onConfirm={confirmDeleteAccount} title={`Excluir ${accountToDelete.name}?`} description="O histórico desta conta será perdido permanentemente." isLoading={isDeleting} />}
      </AnimatePresence>
    </div>
  )
}