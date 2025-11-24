import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { useDateStore } from "../store/useDateStore";
import { useState } from "react";
import { format } from "date-fns";

export function useTransactions() {
  const queryClient = useQueryClient();
  const { currentDate } = useDateStore();

  // =========================
  // PERÍODO DO MÊS
  // =========================
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).toISOString().split("T")[0];

  // =========================
  // PAGINAÇÃO
  // =========================
  const [page, setPage] = useState(1);
  const limit = 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // =========================
  // QUERY PRINCIPAL
  // =========================
  const { data, isLoading: loading, error } = useQuery({
    queryKey: ["transactions", year, month, page],
    queryFn: async () => {
      const { data, count, error } = await supabase
        .from("transactions")
        .select(
          `
          id,
          description,
          amount,
          type,
          date,
          category_id,
          installment_number,
          installment_total,
          installment_id,
          account_id,
          credit_card_id,
          categories(name)
        `,
          { count: "exact" }
        )
        .gte("date", firstDay)
        .lte("date", lastDay)
        .order("date", { ascending: false })
        .range(from, to);

      if (error) throw error;

      return { rows: data ?? [], total: count ?? 0 };
    },
    keepPreviousData: true,
  });

  // =========================
  // AGRUPAMENTO POR DATA
  // =========================
  const grouped = {};

  if (data?.rows?.length > 0) {
    data.rows.forEach((tx) => {
      const key = tx.date;
      if (!grouped[key]) grouped[key] = [];

      grouped[key].push({
        id: tx.id,
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        date: format(new Date(tx.date), "dd/MM/yyyy"),
        category: tx.categories?.name || "Outros",
        installment_number: tx.installment_number,
        installment_total: tx.installment_total,
        installment_id: tx.installment_id,
        credit_card_id: tx.credit_card_id,
      });
    });
  }

  const groupedTransactions = grouped;

  const totalPages = data?.total ? Math.ceil(data.total / limit) : 1;

  const nextPage = () => {
    if (page < totalPages) setPage((p) => p + 1);
  };

  const prevPage = () => {
    if (page > 1) setPage((p) => p - 1);
  };

  // =========================
  // ESTORNO DO LIMITE DE CARTÃO
  // =========================
  async function refundCreditLimit(tx) {
    if (!tx.credit_card_id) return;

    const { data: card } = await supabase
      .from("credit_cards")
      .select("available_limit")
      .eq("id", tx.credit_card_id)
      .single();

    if (!card) return;

    const refundAmount = Math.abs(Number(tx.amount));

    await supabase
      .from("credit_cards")
      .update({
        available_limit: Number(card.available_limit) + refundAmount,
      })
      .eq("id", tx.credit_card_id);
  }

  // =========================
  // DELETE DE TRANSAÇÃO
  // =========================
  const deleteMutation = useMutation({
    mutationFn: async ({ id, mode }) => {
      // buscar a transação completa
      const { data: tx } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", id)
        .single();

      if (!tx) throw new Error("Transação não encontrada.");

      // apagar todas as parcelas
      if (mode === "all" && tx.installment_id) {
        const { data: parcels } = await supabase
          .from("transactions")
          .select("*")
          .eq("installment_id", tx.installment_id);

        for (const p of parcels) {
          await refundCreditLimit(p);
        }

        await supabase
          .from("transactions")
          .delete()
          .eq("installment_id", tx.installment_id);

        return;
      }

      // apagar apenas esta
      await refundCreditLimit(tx);

      await supabase.from("transactions").delete().eq("id", id);
    },

    onSuccess() {
      queryClient.invalidateQueries(["transactions"]);
      queryClient.invalidateQueries(["dashboard"]);
    },
  });

  const deleteTransaction = async (id, mode = "single") => {
    try {
      await deleteMutation.mutateAsync({ id, mode });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  return {
    groupedTransactions,
    loading,
    error: error?.message ?? null,
    deleteTransaction,
    formatDateHeader: (d) => format(new Date(d), "dd MMM yyyy"),
    page,
    totalPages,
    nextPage,
    prevPage,
  };
}
