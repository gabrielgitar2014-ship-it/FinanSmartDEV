import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Wallet, CreditCard, Bot, Settings, Menu, X, Sun, Moon, LogOut 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transações', icon: CreditCard },
  { path: '/accounts', label: 'Contas', icon: Wallet },
  { path: '/agents', label: 'Agentes IA', icon: Bot },
  { path: '/settings', label: 'Ajustes', icon: Settings },
];

export default function AppLayout() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigation = () => {
    setIsSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  // === LÓGICA DE EXIBIÇÃO DO NOME (CORRIGIDA) ===
  const getDisplayName = () => {
    if (!user) return 'Usuário';
    
    const meta = user.user_metadata || {};
    
    // 1. Tenta usar First Name + Last Name (Novo padrão)
    if (meta.first_name) {
      return `${meta.first_name} ${meta.last_name || ''}`.trim();
    }

    // 2. Fallback para full_name (Antigo padrão) - Verifica se é string para não quebrar
    if (meta.full_name && typeof meta.full_name === 'string') {
      return meta.full_name;
    }

    // 3. Fallback para email
    return user.email?.split('@')[0] || 'Visitante';
  };

  const userName = getDisplayName();
  const userAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0284c7&color=fff`;

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* SIDEBAR (DESKTOP) */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">F</div>
          <span className="text-xl font-bold tracking-tight">FindingSmart</span>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 font-medium shadow-sm' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 transition-colors font-medium"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* SIDEBAR (MOBILE) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-72 bg-white dark:bg-slate-900 z-50 shadow-2xl flex flex-col lg:hidden"
            >
              <div className="p-6 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
                <span className="text-xl font-bold">Menu</span>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <X size={24} />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleNavigation}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                      location.pathname === item.path
                        ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 font-medium'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                 <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-medium">
                    <LogOut size={20} />
                    Sair
                  </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 px-4 lg:px-8 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold capitalize">
              {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-yellow-400 transition-all">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <div className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img src={userAvatar} alt="User" className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 object-cover"/>
              <span className="hidden md:block text-sm font-medium">{userName}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
          <div className="max-w-6xl mx-auto pb-20 lg:pb-0"> 
            <Outlet />
          </div>
        </div>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-3 flex justify-between items-center z-30 pb-safe">
          {navItems.slice(0, 4).map((item) => { 
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-600'}`}>
                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </Link>
            )
          })}
          <Link to="/settings" className={`flex flex-col items-center gap-1 ${location.pathname === '/settings' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-600'}`}>
             <Settings size={24} />
          </Link>
        </nav>
      </main>
    </div>
  );
}