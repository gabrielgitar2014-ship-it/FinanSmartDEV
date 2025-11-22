import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

// Contextos e Hooks
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { AccountsProvider } from './hooks/useAccounts' 

// Layout Principal
import AppLayout from './layout/AppLayout' 

// Páginas Públicas
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import InvitePage from './pages/InvitePage'
import LandingPage from './pages/LandingPage' 

// Páginas Protegidas
import DashboardPage from './pages/DashboardPage'
import AccountsPage from './pages/AccountsPage'
import AccountDetailPage from './pages/AccountDetailPage'
import TransactionsPage from './pages/TransactionsPage'
import CategoriesPage from './pages/CategoriesPage' // <-- NOVA PÁGINA
import AgentsPage from './pages/AgentsPage'
import SettingsPage from './pages/SettingsPage'
import LoadingSpinner from './components/LoadingSpinner'

// =======================================================
// Wrapper para Rotas Protegidas
// =======================================================
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    // Tela de carregamento enquanto verifica o estado de autenticação
    return <LoadingSpinner className="h-screen w-screen" /> 
  }

  if (!isAuthenticated) {
    // Redireciona usuários não autenticados para a tela de login
    return <Navigate to="/login" replace />
  }

  // Renderiza o componente filho (AppLayout)
  return children
}

// =======================================================
// Componente de Rotas
// =======================================================
function AppRoutes() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />

        {/* Rotas Protegidas (Todas usam o AppLayout que inclui Sidebar e Footer) */}
        <Route element={<ProtectedRoute><AppLayout><Outlet /></AppLayout></ProtectedRoute>}>
          {/* Rotas Principais */}
          <Route path="/" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/agents" element={<AgentsPage />} />

          {/* Módulos Financeiros */}
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/accounts/:id" element={<AccountDetailPage />} />
          
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/transactions/categories" element={<CategoriesPage />} /> {/* <-- NOVA ROTA */}

        </Route>

        {/* Redirecionamento de rota não encontrada */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

// =======================================================
// Componente Principal
// =======================================================
function App() {
  return (
    <BrowserRouter>
      {/* Provedores de Contexto */}
      <ThemeProvider>
        <AuthProvider>
          <AccountsProvider> {/* Provedor de Contas para estado global */}
            <AppRoutes />
          </AccountsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
