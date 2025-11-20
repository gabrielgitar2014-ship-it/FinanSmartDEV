import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const FullScreenLoading = () => (
  <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div className="flex flex-col items-center gap-3">
      <Loader2 size={48} className="animate-spin text-sky-600" />
      <p className="text-slate-500 text-sm font-medium">Carregando...</p>
    </div>
  </div>
);

/**
 * 1. RequireAuth
 * Garante apenas que existe uma sessão válida.
 */
export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoading />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

/**
 * 2. RequireProfileSetup (Protege o Dashboard)
 * Regra: Só entra se o setup estiver marcado como TRUE no banco.
 * * Nota: Convidados entram aqui pois o Trigger do banco marca eles como true imediatamente.
 */
export function RequireProfileSetup({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <FullScreenLoading />;

  if (!user) return <Navigate to="/login" replace />;

  // SEGREDO 1: Só libera o Dashboard se explicitamente completou o setup
  if (profile?.profile_setup_complete !== true) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

/**
 * 3. RequireNoSetup (Protege o Onboarding)
 * Regra: Só expulsa do Onboarding se o setup for TRUE.
 * * CORREÇÃO DO RACE CONDITION:
 * Não verificamos 'role' aqui. O Admin pode ter role 'admin' (criou rascunho)
 * mas ainda estar com setup 'false', então ele deve PERMANECER aqui.
 */
export function RequireNoSetup({ children }) {
  const { profile, loading } = useAuth();

  if (loading) return <FullScreenLoading />;

  // SEGREDO 2: Só chuta pro dashboard se o setup estiver FINALIZADO.
  // Ter família (role) não basta para te expulsar daqui.
  if (profile?.profile_setup_complete === true) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}