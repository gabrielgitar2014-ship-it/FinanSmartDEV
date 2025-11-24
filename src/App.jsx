import { BrowserRouter, Routes, Route } from "react-router-dom";

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
import CardDetailPage from "./pages/CardDetailPage"; // ⭐ IMPORTA A NOVA PÁGINA

import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import RealtimeManager from "./components/RealtimeManager";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <RealtimeManager />

          <Routes>
            {/* ROTAS PÚBLICAS */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* ROTAS PRIVADAS */}
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

              {/* ⭐ NOVA ROTA DO CARTÃO */}
              <Route path="/cards/:id" element={<CardDetailPage />} />
            </Route>
          </Routes>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
