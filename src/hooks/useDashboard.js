// src/hooks/useDashboard.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { useDateStore } from "../store/useDateStore";
import { useAuth } from "../context/AuthContext";
import { getMonthRange } from "../utils/dateRange";

export function useDashboard() {
  const { currentDate } = useDateStore();
  const { profile } = useAuth();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { firstDay, lastDay } = getMonthRange(year, month);

  const query = useQuery({
    queryKey: ["dashboard", year, month, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      // 0. Contas às quais o usuário tem acesso (próprias + household)
      const { data: myAccounts, error: accountsErr } = await supabase
        .from("accounts")
        .select("id")
        .eq("is_archived", false);

      if (accountsErr) throw new Error(accountsErr.message);

      const accountIds = myAccounts?.map((a) => a.id) || [];

      if (accountIds.length === 0) {
        return {
          monthIncome: 0,
          monthExpense: 0,
          totalBalance: 0,
          totalInvested: 0,
          recentTransactions: [],
        };
      }

      // 1. Receitas (INCOME)
      const { data: incomes, error: incomeErr } = await supabase
        .from("transactions")
        .select("amount")
        .eq("type", "income")
        .in("account_id", accountIds)
        .gte("date", firstDay)
        .lte("date", lastDay)
        .eq("status", "completed")
        .order("date", { ascending: false });

      if (incomeErr) throw new Error(incomeErr.message);

      const monthIncome = incomes?.reduce(
        (sum, t) => sum + Number(t.amount),
        0
      ) || 0;

      // 2. Despesas (EXPENSE)
      const { data: expenses, error: expenseErr } = await supabase
        .from("transactions")
        .select("amount")
        .eq("type", "expense")
        .in("account_id", accountIds)
        .gte("date", firstDay)
        .lte("date", lastDay)
        .eq("status", "completed")
        .order("date", { ascending: false });

      if (expenseErr) throw new Error(expenseErr.message);

      const monthExpense = expenses?.reduce(
        (sum, t) => sum + Math.abs(Number(t.amount)),
        0
      ) || 0;

      // 3. Saldo total (receitas - despesas)
      const totalBalance = monthIncome - monthExpense;

      // 4. Investimentos (accounts.has_investments = true)
      const { data: investAccounts, error: investErr } = await supabase
        .from("accounts")
        .select("investment_balance")
        .eq("user_id", profile.id)
        .eq("has_investments", true);

      if (investErr) throw new Error(investErr.message);

      const totalInvested =
        investAccounts?.reduce(
          (sum, acc) => sum + Number(acc.investment_balance || 0),
          0
        ) || 0;

      // 5. Últimas transações do mês (somente despesas)
      const { data: recent, error: recentErr } = await supabase
        .from("transactions")
        .select(
          `
          id,
          description,
          amount,
          date,
          type,
          categories(name)
        `
        )
        .eq("type", "expense")
        .eq("status", "completed")
        .in("account_id", accountIds)
        .gte("date", firstDay)
        .lte("date", lastDay)
        .order("date", { ascending: false })
        .limit(5);

      if (recentErr) throw new Error(recentErr.message);

      const recentTransactions =
        recent?.map((t) => ({
          id: t.id,
          amount: Number(t.amount),
          type: t.type,
          label: t.description,
          date: new Date(t.date).toLocaleDateString("pt-BR"),
          category: t.categories?.name || "Outros",
          icon: "💸",
        })) || [];

      return {
        monthIncome,
        monthExpense,
        totalBalance,
        totalInvested,
        recentTransactions,
      };
    },

    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchOnWindowFocus: false,
  });

  return {
    data: query.data || {
      monthIncome: 0,
      monthExpense: 0,
      totalBalance: 0,
      totalInvested: 0,
      recentTransactions: [],
    },
    loading: query.isLoading,
    error: query.error?.message,
    refetch: query.refetch,
  };
}
