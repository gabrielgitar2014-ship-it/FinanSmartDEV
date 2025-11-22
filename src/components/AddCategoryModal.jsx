import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Check, Loader2, Tag, DollarSign, ArrowUp, ArrowDown, Users } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useAccounts } from '../hooks/useAccounts' // Apenas para ter o household_id fácil

export default function AddCategoryModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth()
  
  // Pegamos a lista de contas para ter o household_id (melhor que novo fetch)
  // Nota: Isso é um hack. Ideal seria um hook useHousehold.
  const { accounts } = useAccounts() 
  const [householdId] = useState(accounts[0]?.household_id || null)

  const [name, setName] = useState('')
  const [type, setType] = useState('expense') // 'expense' | 'income'
  const [loading, setLoading] = useState(false)

  if (!isOpen || !user) return null

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error('O nome da categoria é obrigatório.')

    setLoading(true)
    try {
      // 1. Inserir no Supabase
      const { error } = await supabase.from('categories').insert({
        name: name.trim(),
        type: type,
        is_system_default: false, // É sempre false se criado pelo usuário
        household_id: householdId // Vincula à família do usuário (RLS protege)
      })

      if (error) throw error

      toast.success(`Categoria "${name}" criada!`)
      onSuccess() // Fecha o modal e atualiza a lista
      setName('')
      setType('expense')

    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar categoria.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center p-0 lg:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }}
        className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nova Categoria</h2>
          <button onClick={onClose} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Campo Nome */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Nome</label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Ração do Rex"
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Tipo (Despesa/Receita) */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Tipo de Fluxo</label>
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button 
                onClick={() => setType('expense')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'expense' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-slate-500'}`}
              >
                <ArrowDown size={14} className="inline mr-1" /> Despesa
              </button>
              <button 
                onClick={() => setType('income')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'income' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500'}`}
              >
                <ArrowUp size={14} className="inline mr-1" /> Receita
              </button>
            </div>
          </div>
          
          {householdId && (
            <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-center">
              <Users size={12} /> Categoria será compartilhada com sua Household.
            </p>
          )}

          <button 
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full py-3.5 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 ${type === 'expense' ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30'}`}
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Salvar Categoria <Check size={20} /></>}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
