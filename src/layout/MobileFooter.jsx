import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, ArrowRightLeft, Wallet, Bot, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Início', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Extrato', path: '/transactions', icon: ArrowRightLeft },
  { label: 'Contas', path: '/accounts', icon: Wallet }, // Botão central destacado
  { label: 'IA', path: '/agents', icon: Bot },
  { label: 'Menu', path: '/settings', icon: Settings },
]

export default function MobileFooter() {
  const location = useLocation()
  const isActive = (path) => location.pathname === path

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 z-50">
      {/* Container com Safe Area Padding para iOS */}
      <div className="flex justify-around items-center px-2 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path)
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center gap-1 min-w-[64px]"
            >
              <div 
                className={`p-1.5 rounded-xl transition-all duration-300 ${
                  active 
                    ? 'bg-indigo-100 text-indigo-600 -translate-y-1 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <item.icon size={22} strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-medium transition-colors ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}