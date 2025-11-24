import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, CreditCard, Wallet, ArrowRight, PlusCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function AccountDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // Buscar informações da conta
      const { data: accountData } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", id)
        .single();

      setAccount(accountData);

      // Buscar cartões associados a essa conta
      const { data: cardData } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("account_id", id);

      setCards(cardData || []);

      setLoading(false);
    }

    if (id) loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="p-6">
        <p className="text-slate-700 dark:text-slate-300">
          Conta não encontrada.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 animate-in fade-in duration-300">

      {/* HEADER */}
      <div className="sticky top-0 z-20 px-4 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <button
          className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={22} className="text-slate-700 dark:text-slate-200" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
          {account.name}
        </h1>
      </div>

      <div className="p-6 space-y-6">

        {/* SALDO */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">
            Saldo atual
          </p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            R$ {Number(account.current_balance).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* CARTÕES ASSOCIADOS */}
        <div>
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase mb-3">
            Cartões vinculados
          </h2>

          {cards.length === 0 ? (
            <div className="text-slate-500 dark:text-slate-400 text-sm">
              Nenhum cartão encontrado.
            </div>
          ) : (
            <div className="space-y-3">
              {cards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => navigate(`/cards/${card.id}`)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                      <CreditCard className="text-slate-600 dark:text-slate-300" size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{card.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        •••• {card.last_4_digits}
                      </p>
                    </div>
                  </div>

                  <ArrowRight className="text-slate-400" size={18} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BOTÃO ADICIONAR NOVO CARTÃO */}
        <button
          onClick={() => navigate(`/add-card?account=${id}`)}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition"
        >
          <PlusCircle size={18} />
          Adicionar cartão
        </button>

      </div>
    </div>
  );
}
