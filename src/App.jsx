import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useThemeStore } from './store/useThemeStore'
import { PrivateRoute } from './components/PrivateRoute'
import { Toaster } from 'sonner'

// Componentes Globais
import RealtimeManager from './components/RealtimeManager'

// Layout Principal
import AppLayout from './layout/AppLayout'

// Páginas Públicas
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import InviteRegisterPage from './pages/InviteRegisterPage'

// Páginas Protegidas
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import AccountsPage from './pages/AccountsPage'
import AccountDetailPage from './pages/AccountDetailPage' // <--- IMPORTADO
import TransactionsPage from './pages/TransactionsPage'

// Wrapper Protegido
const ProtectedLayout = () => {
  return (
    <PrivateRoute>
      <AppLayout />
    </PrivateRoute>
  )
}

function App() {
  const { theme, initTheme } = useThemeStore()

  useEffect(() => {
    initTheme()
  }, [initTheme])

  return (
    <BrowserRouter>
      <AuthProvider>
        <RealtimeManager />
        
        <Toaster 
          richColors 
          position="top-center" 
          theme={theme === 'dark' ? 'dark' : 'light'}
          closeButton
        />

        <Routes>
          {/* --- ROTAS PÚBLICAS --- */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/invite" element={<InviteRegisterPage />} />

          {/* --- ROTA DE ONBOARDING --- */}
          <Route path="/onboarding" element={
            <PrivateRoute>
              <OnboardingPage />
            </PrivateRoute>
          } />

          {/* --- APP PRINCIPAL --- */}
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            
            {/* Rotas de Contas */}
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/accounts/:id" element={<AccountDetailPage />} /> {/* <--- NOVA ROTA */}
            
            <Route path="/transactions" element={<TransactionsPage />} />
            
            {/* Placeholders */}
            <Route path="/agents" element={<div className="p-8 text-center text-slate-500">Agentes de IA em breve...</div>} />
            <Route path="/settings" element={<div className="p-8 text-center text-slate-500">Configurações em breve...</div>} />
          </Route>

          {/* --- FALLBACKS --- */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App