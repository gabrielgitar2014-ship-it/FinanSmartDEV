import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AppLayout from "./layout/AppLayout";
import {PrivateRoute} from "./components/PrivateRoute";

import LoginPage from "./pages/LoginPage";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardPage from "./pages/DashboardPage";
import AccountsPage from "./pages/AccountsPage";
import AccountDetailPage from "./pages/AccountDetailPage";
import TransactionsPage from "./pages/TransactionsPage";
import AddExpensePage from "./pages/AddExpensePage";
import AddIncomePage from "./pages/AddIncomePage";
import CardDetailPage from "./pages/CardDetailPage";

import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import RealtimeManager from "./components/RealtimeManager";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>

          <RealtimeManager />

          <Routes>

            {/* 🔥 REDIRECIONAMENTO CORRIGIDO */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* PÚBLICAS */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* PRIVADAS */}
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

              <Route path="/transactions" element={<TransactionsPage />} />

              <Route path="/add-expense" element={<AddExpensePage />} />
              <Route path="/add-income" element={<AddIncomePage />} />

              {/* NOVO */}
              <Route path="/cards/:id" element={<CardDetailPage />} />

            </Route>
          </Routes>

        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
      </QueryClientProvider>
  );
}
