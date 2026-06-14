import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, ArrowRightLeft, Wallet, Bot, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.png'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Transações', path: '/transactions', icon: ArrowRightLeft },
  { label: 'Contas', path: '/accounts', icon: Wallet },
  { label: 'Agentes IA', path: '/agents', icon: Bot },
  { label: 'Ajustes', path: '/settings', icon: Settings },
]

export default function Sidebar() {
  const location = useLocation()
  const { signOut, profile } = useAuth()

  const isActive = (path) => location.pathname === path

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-white border-r border-slate-200 z-50">
      
      {/* Header / Logo */}
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <img src={logo} alt="FinanSmart" className="w-8 h-auto" />
        <span className="font-bold text-lg text-slate-900 tracking-tight">FinanSmart</span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
              isActive(item.path)
                ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <item.icon 
              size={20} 
              className={isActive(item.path) ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} 
            />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User Profile / Logout */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold text-slate-900 truncate">{profile?.full_name || 'Usuário'}</p>
            <p className="text-xs text-slate-500 truncate">Plano Free</p>
          </div>
        </div>
        
        <button 
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 p-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={14} /> Sair da conta
        </button>
      </div>
    </aside>
  )
}