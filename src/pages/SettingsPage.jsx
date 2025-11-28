import { useNavigate } from 'react-router-dom'
import { 
  User, Users, Moon, ChevronRight, Shield, LogOut, Globe, CreditCard 
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useThemeStore } from '../store/useThemeStore'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const { theme, toggleTheme } = useThemeStore()

  // Componente de Item de Menu
  const MenuItem = ({ icon: Icon, label, subLabel, onClick, isDestructive }) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 last:border-0 first:rounded-t-2xl last:rounded-b-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isDestructive ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-full ${isDestructive ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
          <Icon size={20} className={isDestructive ? 'text-red-600' : 'text-slate-500 dark:text-slate-400'} />
        </div>
        <div className="text-left">
          <p className="font-semibold text-sm">{label}</p>
          {subLabel && <p className="text-xs text-slate-400 font-normal">{subLabel}</p>}
        </div>
      </div>
      <ChevronRight size={18} className="text-slate-300" />
    </button>
  )

  return (
    <div className="pb-32 lg:pb-0 space-y-6 max-w-2xl mx-auto animate-in fade-in duration-500">
      
      {/* Header Simples */}
      <div className="px-4 pt-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ajustes</h1>
      </div>

      {/* Cartão de Perfil Rápido */}
      <div className="px-4" onClick={() => navigate('/settings/profile')}>
        <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-lg shadow-indigo-500/20 flex items-center gap-4 cursor-pointer relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold border-2 border-white/30">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover rounded-full" />
                ) : (
                  profile?.full_name?.charAt(0)
                )}
            </div>
            <div>
                <h2 className="text-lg font-bold">{profile?.full_name}</h2>
                <p className="text-sm opacity-80">{profile?.email}</p>
                <p className="text-xs mt-2 bg-white/20 inline-block px-2 py-0.5 rounded-md">Editar Perfil</p>
            </div>
            {/* Decorativo */}
            <User className="absolute -right-4 -bottom-4 opacity-10 w-32 h-32" />
        </div>
      </div>

      {/* Lista de Menus */}
      <div className="px-4 space-y-6">
        
        {/* Grupo: Conta */}
        <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase ml-2 mb-2">Geral</h3>
            <div className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <MenuItem icon={User} label="Dados Pessoais" subLabel="Endereço, Senha, Foto" onClick={() => navigate('/settings/profile')} />
                <MenuItem icon={Users} label="Minha Família" subLabel="Membros e Convites" onClick={() => navigate('/settings/family')} /> {/* Criaremos depois */}
            </div>
        </div>

        {/* Grupo: Preferências */}
        <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase ml-2 mb-2">App</h3>
            <div className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <MenuItem icon={Moon} label="Tema Escuro" subLabel={`Atualmente: ${theme === 'dark' ? 'Ativo' : 'Inativo'}`} onClick={toggleTheme} />
                <MenuItem icon={Globe} label="Idioma" subLabel="Português (BR)" onClick={() => {}} />
            </div>
        </div>

        {/* Logout */}
        <div className="rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 overflow-hidden">
            <MenuItem icon={LogOut} label="Sair da Conta" isDestructive onClick={signOut} />
        </div>

      </div>
    </div>
  )
}