import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Componentes de Proteção
import { RequireAuth, RequireProfileSetup, RequireNoSetup } from "./components/RouteGuards";

// Componente de Notificação (NOVO)
import AppToaster from "./components/AppToaster";

// Layouts e Pages
import AppLayout from "./layout/AppLayout";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardPage from "./pages/DashboardPage";

// Placeholders
import { TransactionsPage } from "./pages/TransactionsPage.jsx";
import { AccountsPage } from "./pages/AccountsPage.jsx";
import { AgentsPage } from "./pages/AgentsPage.jsx";
import { SettingsPage } from "./pages/SettingsPage.jsx";

export default function App() {
  return (
    <>
      {/* O Toaster fica aqui, invisível até ser chamado */}
      <AppToaster />

      <Routes>
        {/* === ROTAS PÚBLICAS === */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />

        {/* === ROTAS DE ONBOARDING === */}
        <Route 
          path="/onboarding" 
          element={
            <RequireAuth>
              <RequireNoSetup>
                 <OnboardingPage />
              </RequireNoSetup>
            </RequireAuth>
          } 
        />

        {/* === ROTAS DA APLICAÇÃO === */}
        <Route
          element={
            <RequireAuth>
              <RequireProfileSetup>
                <AppLayout />
              </RequireProfileSetup>
            </RequireAuth>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </>
  );
}