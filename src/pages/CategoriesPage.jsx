import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, Plus, Trash2, Edit2, Tag, Home, Car, Activity, DollarSign, 
  Settings, Check, X, TrendingUp, Users, ShoppingBag, Book, Globe, Gift, Briefcase 
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabaseClient'
import { useCategories } from '../hooks/useCategories'
import AddCategoryModal from '../components/AddCategoryModal'

export default function CategoriesPage() {
  const navigate = useNavigate()
  const { categories: allCategories, loading, refetch } = useCategories()
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // FILTRAGEM: Apenas as categorias que o usuário pode gerenciar e as que possuem dados de gasto
  const userCategories = allCategories.filter(c => !c.is_system_default);
  const categoriesWithSpending = userCategories.filter(c => c.totalSpent > 0);
  const categoriesWithoutSpending = userCategories.filter(c => c.totalSpent === 0);

  // Helper de formatação de moeda
  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Helper para buscar ícone (Precisa ser robusto para todos os ícones do seed)
  const getDisplayIcon = (slug, type) => {
    const color = type === 'income' ? 'text-emerald-600' : 'text-red-600';
    switch (slug) {
      case 'home': return <Home size={18} className={color} />;
      case 'car': return <Car size={18} className={color} />;
      case 'activity': return <Activity size={18} className={color} />;
      case 'dollar-sign': return <DollarSign size={18} className={color} />;
      case 'shopping-cart': return <ShoppingBag size={18} className={color} />;
      case 'book': return <Book size={18} className={color} />;
      case 'globe': return <Globe size={18} className={color} />;
      case 'trending-up': return <TrendingUp size={18} className={color} />;
      case 'briefcase': return <Briefcase size={18} className={color} />;
      case 'gift': return <Gift size={18} className={color} />;
      default: return <Tag size={18} className={color} />;
    }
  }

  // Funções de manipulação de dados
  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta categoria? As transações existentes não serão afetadas.')) return
    
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
      toast.success('Categoria excluída!')
      refetch() // Atualiza a lista
    } catch (e) {
      toast.error('Erro ao excluir. Verifique se há muitas transações vinculadas.')
    }
  }

  // Lógica de Renderização de Item
  const renderCategoryList = (list) => (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
        {list.map(cat => (
          <motion.div 
            key={cat.id} 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800/70 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-4">
              {/* Ícone com Cor de Fluxo */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cat.type === 'income' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {getDisplayIcon(cat.icon_slug, cat.type)}
              </div>
              
              {/* Nome e Uso */}
              <div>
                <p className="font-medium text-sm text-slate-900 dark:text-white">{cat.name}</p>
                <p className={`text-xs font-bold ${cat.totalSpent > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                  {cat.totalSpent > 0 ? formatCurrency(cat.totalSpent) : 'Sem uso no mês'}
                </p>
              </div>
            </div>
            
            {/* Ações */}
            <div className="flex gap-3 shrink-0 items-center">
              <span className={`text-xs uppercase font-bold px-2 py-0.5 rounded-full ${cat.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                 {cat.type === 'income' ? 'Receita' : 'Despesa'}
              </span>
              <button title="Excluir" onClick={() => handleDelete(cat.id)} className="p-1 text-slate-400 hover:text-red-600 transition-colors rounded-md">
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
  );


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
        {loading && <div className="animate-pulse space-y-3 pt-6"> {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white rounded-lg shadow-sm"></div>)} </div>}

        {/* --- LISTA DE CATEGORIAS COM GASTOS --- */}
        {categoriesWithSpending.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2"><TrendingUp size={14} className="text-red-400"/> Categorias Ativas (C/ Gastos)</h3>
            {renderCategoryList(categoriesWithSpending)}
          </div>
        )}
        
        {/* --- LISTA DE CATEGORIAS SEM GASTOS --- */}
        {categoriesWithoutSpending.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2"><Check size={14} /></h3>
            {renderCategoryList(categoriesWithoutSpending)}
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && userCategories.length === 0 && (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
                <Tag size={32} className="mx-auto mb-3" />
                <p className="font-bold">Nenhuma categoria personalizada encontrada.</p>
                <p className="text-sm">Clique em "+ Nova" para começar.</p>
            </div>
        )}

      </div>

      {/* MODAL (Para criar e ver sugestões) */}
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
