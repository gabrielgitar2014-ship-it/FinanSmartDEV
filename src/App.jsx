import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AppLayout from "./layout/AppLayout";
import { PrivateRoute } from "./components/PrivateRoute";

import LoginPage from "./pages/LoginPage";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardPage from "./pages/DashboardPage";
import AccountsPage from "./pages/AccountsPage";
import AccountDetailPage from "./pages/AccountDetailPage";
import TransactionsPage from "./pages/TransactionsPage";
import AddExpensePage from "./pages/AddExpensePage";
import AddIncomePage from "./pages/AddIncomePage";
import CardDetailPage from "./pages/CardDetailPage";
import SettingsPage from "./pages/SettingsPage"; // ⭐ nova importação
import CreateAccountPage from "./pages/CreateAccountPage";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import RealtimeManager from "./components/RealtimeManager";

// 🔥 QueryClient global para TODA a aplicação
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <RealtimeManager />

            <Routes>
              {/* Redirecionamento para dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Públicas */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />

              {/* Privadas */}
              <Route
                element={
                  <PrivateRoute>
                    <AppLayout />
                  </PrivateRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/accounts/:id" element={<AccountDetailPage />} />
                <Route path="/accounts/new element={<CreateAccountPage />} />

                <Route path="/transactions" element={<TransactionsPage />} />

                <Route path="/add-expense" element={<AddExpensePage />} />
                <Route path="/add-income" element={<AddIncomePage />} />

             
                <Route path="/cards/:id" element={<CardDetailPage />} />

              
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
