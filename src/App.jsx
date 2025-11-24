import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'

// React Query
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Contextos e Stores
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { useThemeStore } from './store/useThemeStore'

// Componentes de Sistema
import { PrivateRoute } from './components/PrivateRoute'
import RealtimeManager from './components/RealtimeManager'

// Layout Principal
import AppLayout from './layout/AppLayout'

// Páginas Públicas
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import InviteRegisterPage from './pages/InviteRegisterPage'

// Páginas Fullscreen (sem menu)
import OnboardingPage from './pages/OnboardingPage'
import CreateAccountPage from './pages/CreateAccountPage'
import AddExpensePage from './pages/AddExpensePage'
import AddIncomePage from './pages/AddIncomePage'

// Páginas do App Principal
import DashboardPage from './pages/DashboardPage'
import AccountsPage from './pages/AccountsPage'
import AccountDetailPage from './pages/AccountDetailPage'
import TransactionsPage from './pages/TransactionsPage'
import CategoriesPage from './pages/CategoriesPage'
import SettingsPage from './pages/SettingsPage'
import ProfileSettings from './pages/settings/ProfileSettings'

// React Query Client
const queryClient = new QueryClient()

// Wrapper para rotas protegidas
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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            
            {/* Gerenciadores Globais */}
            <RealtimeManager />
            <Toaster
              richColors
              position="top-center"
              theme={theme === 'dark' ? 'dark' : 'light'}
              closeButton
            />

            <Routes>
              {/* === ROTAS PÚBLICAS === */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/invite" element={<InviteRegisterPage />} />

              {/* === FULLSCREEN PROTEGIDAS === */}
              <Route path="/onboarding" element={
                <PrivateRoute>
                  <OnboardingPage />
                </PrivateRoute>
              } />

              <Route path="/accounts/new" element={
                <PrivateRoute>
                  <CreateAccountPage />
                </PrivateRoute>
              } />

              <Route path="/transactions/new-expense" element={
                <PrivateRoute>
                  <AddExpensePage />
                </PrivateRoute>
              } />

              <Route path="/transactions/new-income" element={
                <PrivateRoute>
                  <AddIncomePage />
                </PrivateRoute>
              } />

              {/* === PRINCIPAL (COM LAYOUT) === */}
              <Route element={<ProtectedLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />

                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/accounts/:id" element={<AccountDetailPage />} />

                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/transactions/categories" element={<CategoriesPage />} />

                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/profile" element={<ProfileSettings />} />

                <Route path="/agents" element={
                  <div className="p-8 text-center text-slate-500">
                    <h2 className="text-xl font-bold mb-2">Agentes de IA</h2>
                    <p>Em breve...</p>
                  </div>
                } />
              </Route>

              {/* === FALLBACKS === */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />

            </Routes>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
