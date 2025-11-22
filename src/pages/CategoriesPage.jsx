import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, Plus, Trash2, Edit2, Tag, Home, Car, Activity, DollarSign, 
  Settings, Check, X
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabaseClient'
import { useCategories } from '../hooks/useCategories'
import AddCategoryModal from '../components/AddCategoryModal'

export default function CategoriesPage() {
  const navigate = useNavigate()
  const { categories, loading, refetch } = useCategories()
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Funções de manipulação de dados
  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta categoria? As transações existentes não serão afetadas.')) return
    
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
      toast.success('Categoria excluída!')
      refetch()
    } catch (e) {
      toast.error('Erro ao excluir. Verifique se há muitas transações vinculadas.')
    }
  }

  // Separa as categorias para exibição (Sugestões vs. Usuário)
  const systemCategories = categories.filter(c => c.is_system_default)
  const userCategories = categories.filter(c => !c.is_system_default)

  // Helper para buscar ícone (simulação, idealmente viria do ícone_slug)
  const getDisplayIcon = (slug) => {
    switch (slug) {
      case 'home': return <Home size={18} />;
      case 'car': return <Car size={18} />;
      case 'activity': return <Activity size={18} />;
      case 'dollar-sign': return <DollarSign size={18} />;
      default: return <Tag size={18} />;
    }
  }

  return (
    <div className="pb-28 lg:pb-0 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex items-center justify-between px-1 py-2 mb-6 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-slate-50 dark:bg-slate-950 z-10">
        <button onClick={() => navigate('/transactions')} className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-500 hover:text-indigo-600 shadow-sm"><ChevronLeft size={20} /></button>
        <h1 className="font-bold text-xl text-slate-900 dark:text-white">Gerenciar Categorias</h1>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-md hover:bg-indigo-700 transition-colors active:scale-95">
          <Plus size={18} /> Nova
        </button>
      </div>
      
      <div className="px-4 space-y-8">

        {/* LOADING STATE */}
        {loading && <div className="animate-pulse space-y-3"><div className="h-6 w-32 bg-slate-200 rounded"></div>{[1, 2, 3].map(i => <div key={i} className="h-12 bg-white rounded-lg shadow-sm"></div>)}</div>}

        {/* MINHAS CATEGORIAS (Personalizadas) */}
        {userCategories.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2"><Settings size={14} /> Minhas Categorias</h3>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              {userCategories.map(cat => (
                <div key={cat.id} className="flex justify-between items-center p-4 border-b border-slate-50 dark:border-slate-800/70 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cat.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {getDisplayIcon(cat.icon_slug)}
                    </div>
                    <span className="font-medium text-sm text-slate-900 dark:text-white">{cat.name}</span>
                    <span className="text-xs text-slate-400">({cat.type === 'income' ? 'Receita' : 'Despesa'})</span>
                  </div>
                  
                  <div className="flex gap-2">
                    {/* Botão de Excluir */}
                    <button onClick={() => handleDelete(cat.id)} className="p-1 text-slate-400 hover:text-red-600 transition-colors rounded-md">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUGESTÕES DO SISTEMA */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2"><Check size={14} /> Sugestões Padrão (Não Editáveis)</h3>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            {systemCategories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center p-4 border-b border-slate-50 dark:border-slate-800/70 last:border-b-0 opacity-70">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cat.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {getDisplayIcon(cat.icon_slug)}
                  </div>
                  <span className="font-medium text-sm text-slate-900 dark:text-white">{cat.name}</span>
                </div>
                <span className="text-xs text-slate-400">Padrão</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <AddCategoryModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={() => { refetch(); setIsModalOpen(false); }} 
          />
        )}
      </AnimatePresence>

    </div>
  )
}
