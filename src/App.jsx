import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'

// Contextos e Stores
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext' // <--- IMPORTADO
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

// Páginas Protegidas
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'

// Módulo Contas
import AccountsPage from './pages/AccountsPage'
import AccountDetailPage from './pages/AccountDetailPage'
import CreateAccountPage from './pages/CreateAccountPage'

// Módulo Transações
import TransactionsPage from './pages/TransactionsPage'
import CategoriesPage from './pages/CategoriesPage'

// Módulo Configurações
import SettingsPage from './pages/SettingsPage'
import ProfileSettings from './pages/settings/ProfileSettings'

// Wrapper para Rotas Protegidas (Layout Padrão)
const ProtectedLayout = () => {
  return (
    <PrivateRoute>
      <AppLayout />
    </PrivateRoute>
  )
}

function App() {
  const { theme, initTheme } = useThemeStore()

  // Inicializa o tema (Dark/Light) ao carregar
  useEffect(() => {
    initTheme()
  }, [initTheme])

  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Provider de Idioma (Envolve a app para disponibilizar traduções) */}
        <LanguageProvider>
          
          {/* Gerenciador de Sincronização em Tempo Real (Invisível) */}
          <RealtimeManager />
          
          {/* Notificações Globais */}
          <Toaster 
            richColors 
            position="top-center" 
            theme={theme === 'dark' ? 'dark' : 'light'}
            closeButton
          />

          <Routes>
            {/* ====================================================
                ROTAS PÚBLICAS
               ==================================================== */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/invite" element={<InviteRegisterPage />} />

            {/* ====================================================
                ROTA DE ONBOARDING (Sem Layout Padrão)
               ==================================================== */}
            <Route path="/onboarding" element={
              <PrivateRoute>
                <OnboardingPage />
              </PrivateRoute>
            } />

            {/* ====================================================
                APP PRINCIPAL (Com Sidebar e Footer)
               ==================================================== */}
            <Route element={<ProtectedLayout />}>
              {/* Dashboard */}
              <Route path="/dashboard" element={<DashboardPage />} />
              
              {/* Contas Bancárias */}
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/accounts/:id" element={<AccountDetailPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
<Route path="/accounts/new" element={<CreateAccountPage />} />
              
              {/* Transações e Categorias */}
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/transactions/categories" element={<CategoriesPage />} />
              
              {/* Configurações e Perfil */}
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/profile" element={<ProfileSettings />} />
              
              {/* Placeholder para Agentes */}
              <Route path="/agents" element={
                <div className="p-8 text-center text-slate-500">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Agentes de IA</h2>
                  <p>Em breve você terá assistentes inteligentes aqui.</p>
                </div>
              } />
            </Route>

            {/* ====================================================
                REDIRECIONAMENTOS (FALLBACKS)
               ==================================================== */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />

          </Routes>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App