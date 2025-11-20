import React from "react";

export function TransactionsPage() {
  return (
    <div className="fs-glass rounded-2xl p-4 md:p-5">
      <h1 className="text-sm font-semibold mb-2">Transações</h1>
      <p className="text-xs text-slate-400 mb-4">
        Lista mock de transações. Conecte aqui futuramente a tabela transactions do Supabase.
      </p>
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 text-xs text-slate-300">
        Nenhuma transação cadastrada ainda.
      </div>
    </div>
  );
}
