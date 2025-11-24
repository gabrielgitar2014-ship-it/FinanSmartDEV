// src/pages/CardDetailPage.jsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  CreditCard,
  AlertCircle,
  ArrowRight,
  Calendar,
  Gauge,
  Tag,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "../lib/supabaseClient";
import { useUIStore } from "../store/useUIStore";
import { getFullInvoiceSummary } from "../lib/billingService";

// Hook simples para formatar valores respeitando o showValues
function useMoneyFormatter() {
  const { showValues } = useUIStore();
  const formatMoney = (value) => {
    if (!showValues) return "••••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(value || 0));
  };
  return { formatMoney, showValues };
}

export default function CardDetailPage() {
  const { id } = useParams(); // id do cartão vindo da rota: /cards/:id
  const navigate = useNavigate();
  const { formatMoney } = useMoneyFormatter();

  const [activeTab, setActiveTab] = useState("current"); // 'current' | 'next'

  // ==============================
  // QUERY PRINCIPAL
  // ==============================
  const { data, isLoading, error } = useQuery({
    queryKey: ["card-detail", id],
    queryFn: async () => {
      if (!id) throw new Error("Cartão não informado.");

      // Buscar dados do cartão
      const { data: card, error: cardError } = await supabase
        .from("credit_cards")
        .select(
          "id, name, last_4_digits, closing_day, due_day, limit_amount, available_limit, account_id, created_at"
        )
        .eq("id", id)
        .single();

      if (cardError || !card) {
        throw new Error("Cartão não encontrado.");
      }

      // Buscar conta associada
      const { data: account } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("id", card.account_id)
        .single();

      // Buscar transações desse cartão
      const { data: transactions, error: txError } = await supabase
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
            categories(name)
          `
        )
        .eq("credit_card_id", id)
        .order("date", { ascending: false });

      if (txError) {
        throw new Error("Erro ao carregar transações do cartão.");
      }

      const txList = transactions || [];

      // Resumo completo de fatura via billingService (sensível ao tempo)
      const summary = getFullInvoiceSummary(card, txList, new Date());

      return {
        card,
        account,
        transactions: txList,
        summary,
      };
    },
  });

  const handleBack = () => navigate(-1);

  // ==============================
  // ESTADOS DERIVADOS
  // ==============================
  let content = null;

  if (isLoading) {
    content = (
      <div className="p-4 space-y-4">
        <div className="h-28 bg-slate-100 dark:bg-slate-900 rounded-3xl animate-pulse" />
        <div className="h-10 bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  } else if (error) {
    content = (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex gap-3">
          <AlertCircle className="text-red-500 mt-0.5" />
          <div>
            <p className="font-bold text-red-700 dark:text-red-300">
              Erro ao carregar cartão
            </p>
            <p className="text-sm text-red-600 dark:text-red-400">
              {error.message}
            </p>
          </div>
        </div>
      </div>
    );
  } else if (data) {
    const { card, account, summary } = data;

    const totalLimit = Number(card.limit_amount || 0);
    const availableLimit = Number(card.available_limit || 0);
    const usedLimit = totalLimit ? totalLimit - availableLimit : null;

    const { currentInvoice, nextInvoice, committedLimit } = summary;

    const activeInvoice =
      activeTab === "current" ? currentInvoice : nextInvoice;
    const activeTitle =
      activeTab === "current" ? "Fatura atual" : "Próxima fatura";

    // 🔥 Agora usamos o período vindo do billingService, que se adapta ao tempo
    const activePeriod =
      activeTab === "current" ? summary.currentPeriod : summary.nextPeriod;

    const periodStartLabel = activePeriod
      ? format(activePeriod.periodStart, "dd MMM", { locale: ptBR })
      : "--";
    const periodEndLabel = activePeriod
      ? format(activePeriod.periodEnd, "dd MMM", { locale: ptBR })
      : "--";

    const dueDay = card.due_day
      ? String(card.due_day).padStart(2, "0")
      : "--";

    // Progresso de limite
    let limitPercent = 0;
    if (totalLimit > 0 && usedLimit !== null) {
      limitPercent = Math.min(
        100,
        Math.max(0, (usedLimit / totalLimit) * 100)
      );
    }

    content = (
      <div className="pb-28 lg:pb-0">
        {/* HEADER DO CARTÃO */}
        <div className="px-4 pt-4 pb-6 bg-gradient-to-br from-indigo-600 via-purple-600 to-slate-900 text-white rounded-b-3xl shadow-lg">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 mb-4 text-indigo-100 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="text-sm font-medium">Voltar</span>
          </button>

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard size={24} className="opacity-80" />
                <h1 className="text-xl font-bold leading-tight">
                  {card.name || "Cartão de Crédito"}
                </h1>
              </div>
              <p className="text-xs text-indigo-100/80 mt-1">
                {account ? account.name : "Conta"} • ••••{" "}
                {card.last_4_digits || "0000"}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-indigo-100/70 mt-1">
                Fecha dia {String(card.closing_day || "--").padStart(2, "0")} •
                Vence dia {dueDay}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase text-indigo-100/70 font-semibold">
                Limite utilizado
              </p>
              <p className="text-lg font-bold">
                {totalLimit ? formatMoney(usedLimit) : "–"}
              </p>
              {totalLimit > 0 && (
                <p className="text-[11px] text-indigo-100/80 mt-0.5">
                  de {formatMoney(totalLimit)}
                </p>
              )}
            </div>
          </div>

          {/* Barra de limite */}
          {totalLimit > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] text-indigo-100/80 mb-1">
                <span>Limite</span>
                <span>Disp.: {formatMoney(availableLimit)}</span>
              </div>
              <div className="w-full h-2 bg-indigo-900/40 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-gradient-to-r from-emerald-400 via-yellow-300 to-red-400 rounded-full transition-all"
                  style={{ width: `${limitPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* CARD DE FATURA */}
        <div className="px-4 -mt-6 mb-4 relative z-10">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  {activeTitle}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatMoney(activeInvoice.total || 0)}
                </p>
              </div>
              <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                <p className="flex items-center gap-1 justify-end">
                  <Calendar size={14} />
                  <span>
                    {periodStartLabel} - {periodEndLabel}
                  </span>
                </p>
                <p className="mt-1 flex items-center gap-1 justify-end">
                  <Gauge size={14} />
                  <span>
                    Comprometido futuro: {formatMoney(committedLimit || 0)}
                  </span>
                </p>
              </div>
            </div>

            {/* Tabs Fatura atual / próxima */}
            <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 mt-2">
              <button
                onClick={() => setActiveTab("current")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === "current"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Atual
              </button>
              <button
                onClick={() => setActiveTab("next")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === "next"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Próxima
              </button>
            </div>
          </div>
        </div>

        {/* LISTA DE TRANSAÇÕES DA FATURA SELECIONADA */}
        <div className="px-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Transações da {activeTitle.toLowerCase()}
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              {activeInvoice.transactions.length} lançamentos
              <ArrowRight size={12} />
            </span>
          </div>

          {activeInvoice.transactions.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
              <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-3">
                <CreditCard size={22} />
              </div>
              <p className="text-sm font-medium">
                Nenhuma transação nessa fatura.
              </p>
              <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                As compras feitas com este cartão irão aparecer aqui.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              {activeInvoice.transactions.map((tx, index) => {
                const isLast =
                  index === activeInvoice.transactions.length - 1;
                const dateLabel = format(
                  new Date(tx.date + "T12:00:00"),
                  "dd/MM",
                  { locale: ptBR }
                );
                const categoryName = tx.categories?.name || "Outros";
                const isInstallment = tx.installment_total > 1;

                return (
                  <div
                    key={tx.id}
                    className={`flex items-center justify-between px-4 py-3 ${
                      !isLast
                        ? "border-b border-slate-100 dark:border-slate-800/70"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <Tag
                          size={16}
                          className="text-slate-500 dark:text-slate-300"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {tx.description}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <span>{categoryName}</span>
                          <span>•</span>
                          <span>{dateLabel}</span>
                          {isInstallment && (
                            <>
                              <span>•</span>
                              <span>
                                {tx.installment_number}/
                                {tx.installment_total}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono font-bold text-red-500">
                        {formatMoney(Math.abs(tx.amount))}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {content}
    </div>
  );
}
