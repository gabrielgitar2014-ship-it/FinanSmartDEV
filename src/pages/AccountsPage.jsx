import React from "react";

export function AccountsPage() {
  return (
    <div className="fs-glass rounded-2xl p-4 md:p-5">
      <h1 className="text-sm font-semibold mb-2">Contas & Bancos</h1>
      <p className="text-xs text-slate-400 mb-4">
        Aqui entram os bancos configurados, contas e cartões. Integração futura com issuers, products e wallet cards.
      </p>
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 text-xs text-slate-300">
        Nenhuma conta cadastrada ainda.
      </div>
    </div>
  );
}
