import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileFooter from './MobileFooter'
import MonthSelector from '../components/MonthSelector' // <--- Importar

export default function AppLayout() {
  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* --- HEADER GLOBAL (SELETOR DE MÊS) --- */}
        {/* Adicionamos um header fixo no topo do layout mobile/desktop */}
        <header className="w-full bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md z-20 border-b border-slate-100 dark:border-slate-800 lg:hidden">
          <MonthSelector />
        </header>

        {/* Área de Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto scroll-smooth p-4 md:p-8 pb-32 lg:pb-8 w-full max-w-7xl mx-auto">
          
          {/* Para Desktop, podemos mostrar o seletor aqui ou no header da sidebar. 
              Vou deixar aqui condicional para desktop também se quiser alinhar. */}
          <div className="hidden lg:block mb-6">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Visão Geral</h2>
                <div className="bg-white dark:bg-slate-900 p-1 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <MonthSelector />
                </div>
             </div>
          </div>

          <Outlet />
        </div>
      </main>

      <MobileFooter />
    </div>
  )
}