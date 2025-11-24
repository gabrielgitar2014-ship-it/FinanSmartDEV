import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  X, Check, Loader2, Tag, DollarSign, ArrowUp, ArrowDown, Users, 
  AlertCircle, ShoppingBag, Home, Car, Activity, Gift 
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useAccounts } from '../hooks/useAccounts' 
import { SYSTEM_CATEGORIES } from '../constants/categories' 

export default function AddCategoryModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth()
  const { accounts } = useAccounts()

  const [householdId, setHouseholdId] = useState(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('expense')
  const [loading, setLoading] = useState(false)
  const [selectedSuggestions, setSelectedSuggestions] = useState([])

  // NOVO: calcular padding inferior dinamicamente
  const footerRef = useRef(null)
  const [safePadding, setSafePadding] = useState(120)

  // Atualiza o padding com base na altura do footer
  useEffect(() => {
    if (footerRef.current) {
      const h = footerRef.current.offsetHeight
      setSafePadding(h + 32) // margem extra
    }
  }, [isOpen])

  // Buscar household
  useEffect(() => {
    if (!user) return
    const fetchHH = async () => {
      const { data } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) setHouseholdId(data.household_id)
    }
    fetchHH()
  }, [user])

  // Resetar modal ao abrir
  useEffect(() => {
    if (isOpen) {
      setSelectedSuggestions([])
      setName('')
    }
  }, [isOpen, type])

  if (!isOpen || !user) return null

  const handleToggleSuggestion = (cat) => {
    if (selectedSuggestions.some(s => s.id === cat.id)) {
      setSelectedSuggestions(prev => prev.filter(s => s.id !== cat.id))
    } else {
      setSelectedSuggestions(prev => [...prev, cat])
    }
    setName('')
  }

  const handleSubmit = async () => {
    if (!householdId) return toast.error('Erro: Household não encontrada')

    // Criar categoria manual
    if (name.trim()) {
      setLoading(true)
      try {
        const { error } = await supabase.from('categories').insert({
          name: name.trim(),
          type,
          is_system_default: false,
          household_id: householdId
        })
        if (error) throw error
        toast.success(`Categoria "${name}" criada!`)
        onSuccess()
        onClose()
      } catch (err) {
        toast.error('Erro ao salvar.')
      } finally {
        setLoading(false)
      }
      return
    }

    // Criar várias categorias pré-selecionadas
    if (selectedSuggestions.length > 0) {
      setLoading(true)
      try {
        const batch = selectedSuggestions.map(cat => ({
          name: cat.name,
          type: cat.type,
          icon_slug: cat.icon_slug,
          is_system_default: false,
          household_id: householdId
        }))

        const { error } = await supabase.from('categories').insert(batch)
        if (error) throw error

        toast.success(`${selectedSuggestions.length} categorias adicionadas!`)
        onSuccess()
        onClose()
      } catch (err) {
        toast.error('Erro ao salvar em lote.')
      } finally {
        setLoading(false)
      }
      return
    }

    toast.error('Digite um nome ou selecione sugestões.')
  }

  const getDisplayIcon = (slug) => {
    switch (slug) {
      case 'shopping-cart': return <ShoppingBag size={14} />
      case 'home': return <Home size={14} />
      case 'car': return <Car size={14} />
      case 'activity': return <Activity size={14} />
      case 'gift': return <Gift size={14} />
      case 'dollar-sign': return <DollarSign size={14} />
      default: return <Tag size={14} />
    }
  }

  const currentSuggestions = SYSTEM_CATEGORIES.filter(c => c.type === type)

  return (
    <div className="fixed inset-0 z-[70] flex items-end lg:items-center justify-center p-0 lg:p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >

        {/* HEADER */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10 bg-white dark:bg-slate-900">
          <h2 className="text-lg font-bold">Nova Categoria</h2>
          <button onClick={onClose} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full">
            <X size={18} />
          </button>
        </div>

        {/* ÁREA ROLÁVEL COM PADDING DINÂMICO */}
        <div 
          className="flex-1 overflow-y-auto p-6 space-y-6"
          style={{ paddingBottom: safePadding }}
        >

          {/* Botões Toggle */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setType('expense')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                type === 'expense'
                  ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <ArrowDown size={14} className="inline mr-1" /> Despesa
            </button>

            <button
              onClick={() => setType('income')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                type === 'income'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <ArrowUp size={14} className="inline mr-1" /> Receita
            </button>
          </div>

          {/* Campo manual */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">
              Criar Personalizada
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setSelectedSuggestions([]) }}
                placeholder="Digite o nome..."
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl py-3 pl-10 pr-4 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Sugestões padrão */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <AlertCircle size={14} className="text-indigo-500" /> Ou selecione várias:
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {currentSuggestions.map(cat => {
                const isSelected = selectedSuggestions.some(s => s.id === cat.id)
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleToggleSuggestion(cat)}
                    className={`flex flex-col items-center p-2 rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-500 dark:bg-indigo-900/50'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                    }`}
                  >
                    <div className={`${isSelected ? 'scale-110 text-indigo-700' : 'text-slate-500'} transition-transform`}>
                      {getDisplayIcon(cat.icon_slug)}
                    </div>
                    <span className={`text-[10px] font-bold mt-1 line-clamp-1 ${isSelected ? 'text-indigo-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                      {cat.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {householdId && (
            <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-center pt-2">
              <Users size={12} /> Categoria será compartilhada com sua Família.
            </p>
          )}
        </div>

        {/* FOOTER FIXO */}
        <div
          ref={footerRef}
          className="absolute bottom-0 left-0 w-full p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-20"
        >
          <button
            onClick={handleSubmit}
            disabled={loading || (!name && selectedSuggestions.length === 0)}
            className={`w-full py-3.5 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              type === 'expense'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : name ? (
              <>Criar "{name}" <Check size={20} /></>
            ) : selectedSuggestions.length > 0 ? (
              <>Adicionar ({selectedSuggestions.length}) <Check size={20} /></>
            ) : (
              "Selecione ou Digite"
            )}
          </button>
        </div>

      </motion.div>
    </div>
  )
}
