import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function PrivateRoute({ children }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  console.log(`[PrivateRoute] Visitando: ${location.pathname}`)
  console.log('[PrivateRoute] Status:', { loading, hasUser: !!user, hasProfile: !!profile, onboarding: profile?.onboarding_completed })

  if (loading) {
    return <div>Carregando rota...</div>
  }

  // 1. Não logado -> Login
  if (!user) {
    console.log('[PrivateRoute] Bloqueado: Sem usuário -> Redirecionando p/ Login')
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 2. Logado, mas Onboarding pendente
  if (profile && !profile.onboarding_completed && location.pathname !== '/onboarding') {
    console.log('[PrivateRoute] Bloqueado: Onboarding pendente -> Redirecionando p/ Onboarding')
    return <Navigate to="/onboarding" replace />
  }

  // 3. Caso especial: Usuário já fez onboarding mas tenta acessar /onboarding manualmente
  if (profile && profile.onboarding_completed && location.pathname === '/onboarding') {
    console.log('[PrivateRoute] Bloqueado: Onboarding já feito -> Redirecionando p/ Dashboard')
    return <Navigate to="/dashboard" replace />
  }

  console.log('[PrivateRoute] Acesso permitido.')
  return children
}