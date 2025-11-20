import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  User, Lock, Bell, Users, ChevronRight, Moon, Sun, LogOut, ShieldCheck, Mail
} from 'lucide-react';

export function SettingsPage() {
  const { user, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  // Extração segura do nome
  const firstName = user?.user_metadata?.first_name || 'Usuário';
  const lastName = user?.user_metadata?.last_name || '';
  const email = user?.email;

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Ajustes</h2>
        <p className="text-slate-500 dark:text-slate-400">Gerencie suas preferências e conta.</p>
      </div>

      {/* === SEÇÃO 1: PERFIL (Visível para TODOS) === */}
      <section className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <User size={20} className="text-sky-500" />
            Meu Perfil
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-2xl font-bold">
              {firstName.charAt(0)}
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-lg">{firstName} {lastName}</h4>
              <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                  role === 'admin' 
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {role === 'admin' ? 'Administrador' : 'Membro da Família'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
             <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Email</label>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                  <Mail size={16} /> {email}
                </div>
             </div>
             {/* Outros campos de perfil viriam aqui */}
          </div>
        </div>
      </section>

      {/* === SEÇÃO 2: APARÊNCIA E SISTEMA (Visível para TODOS) === */}
      <section className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
         <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Settings size={20} className="text-slate-500" />
            Preferências
          </h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          
          {/* Tema */}
          <div className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={toggleTheme}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 rounded-lg">
                {theme === 'light' ? <Sun size={20}/> : <Moon size={20}/>}
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Aparência</p>
                <p className="text-xs text-slate-500">Alternar entre modo claro e escuro</p>
              </div>
            </div>
            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-200'}`}>
               <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
          </div>

          {/* Alterar Senha */}
          <div className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded-lg">
                <Lock size={20}/>
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Segurança</p>
                <p className="text-xs text-slate-500">Alterar senha e autenticação</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-slate-400" />
          </div>
        </div>
      </section>

      {/* === SEÇÃO 3: GESTÃO DA FAMÍLIA (APENAS ADMIN) === */}
      {role === 'admin' && (
        <section className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Users size={20} className="text-emerald-500" />
              Membros da Família
            </h3>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">ADMIN</span>
          </div>
          
          <div className="p-6">
            <p className="text-sm text-slate-500 mb-6">
              Gerencie quem tem acesso ao painel financeiro da sua família.
            </p>

            {/* Lista de Membros (Exemplo Visual) */}
            <div className="space-y-3">
              {/* Admin (Eu) */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
                      {firstName.charAt(0)}
                    </div>
                    <div>
                       <p className="text-sm font-bold text-slate-900 dark:text-white">{firstName} (Você)</p>
                       <p className="text-xs text-slate-500">Administrador</p>
                    </div>
                 </div>
              </div>

              {/* Botão para Convidar (Simulação) */}
              <button className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all flex items-center justify-center gap-2 text-sm font-medium">
                 <Users size={18} />
                 Convidar novo membro
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Botão de Sair (Zona de Perigo) */}
      <div className="pt-4">
        <button 
          onClick={signOut}
          className="flex items-center gap-2 text-rose-600 hover:text-rose-700 font-medium text-sm px-2"
        >
          <LogOut size={18} />
          Sair da conta
        </button>
      </div>
    </div>
  );
}