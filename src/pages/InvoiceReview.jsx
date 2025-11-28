import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, parseISO, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, AlertCircle, Layers, Save, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';

// URL da sua Edge Function (a mesma usada antes)
const EDGE_FUNCTION_URL = 'https://tggsnqafmsdldgvpjgdm.supabase.co/functions/v1/hyper-processor'; 

export default function InvoiceReview() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  if (!state || !state.transactions) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <p className="text-slate-500 mb-4">Nenhum dado para revisar.</p>
        <button onClick={() => navigate('/agents/invoice-import')} className="text-indigo-600 font-bold">Voltar</button>
      </div>
    );
  }

  const [transactions, setTransactions] = useState(state.transactions);
  const referenceDate = parseISO(state.referenceDate + '-01');

  const handleDelete = (id) => {
    if (confirm('Remover este lançamento?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  // --- AQUI ESTÁ A MUDANÇA CRÍTICA ---
  const handleConfirmSave = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada.");

      // Prepara o payload para a Edge Function
      // Note que a Edge Function espera 'transactions' (array pronto) e 'account_id'
      const payload = {
        transactions: transactions, 
        account_id: state.accountId // O ID da conta veio do passo anterior
      };

      // Chama a Edge Function (Segura)
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${session.access_token}` // Token para passar na segurança
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao processar na nuvem.");
      }

      toast.success("Sucesso! O extrato foi atualizado.");
      navigate('/dashboard');

    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const totalValue = transactions.reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans">
      
      {/* HEADER FIXO */}
      <div className="bg-white border-b border-slate-200 px-6 py-6 shrink-0 z-20 shadow-sm relative">
        <div className="max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm">
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para Edição
            </button>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                Revisão Final
            </span>
            </div>
            
            <div className="flex flex-row justify-between items-end gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Confirme os Lançamentos</h1>
                <p className="text-slate-500 text-sm mt-1">
                Verifique se as datas e parcelas estão corretas.
                </p>
            </div>
            <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5 tracking-wider">Impacto Total</p>
                <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                </p>
            </div>
            </div>
        </div>
      </div>

      {/* BODY SCROLLÁVEL */}
      <div className="flex-1 overflow-y-auto px-4 py-6 bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-6">
            
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-800 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>
                Itens em <strong>verde</strong> são da fatura atual. Itens em <strong>cinza</strong> são parcelas passadas ou futuras.
            </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                    <div className="col-span-2">Data</div>
                    <div className="col-span-6 md:col-span-5">Descrição</div>
                    <div className="col-span-2 hidden md:block">Parcela</div>
                    <div className="col-span-3 md:col-span-2 text-right">Valor</div>
                    <div className="col-span-1"></div>
                </div>

                <div className="divide-y divide-slate-100">
                    {transactions.map((tx) => {
                    const isCurrentMonth = isSameMonth(parseISO(tx.date), referenceDate);
                    
                    return (
                        <div 
                        key={tx.id} 
                        className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors hover:bg-slate-50 ${isCurrentMonth ? 'bg-white' : 'bg-slate-50/50 grayscale opacity-70 hover:grayscale-0 hover:opacity-100'}`}
                        >
                        <div className="col-span-2 flex flex-col">
                            <span className={`font-bold text-sm ${isCurrentMonth ? 'text-slate-900' : 'text-slate-500'}`}>
                            {format(parseISO(tx.date), 'dd/MM')}
                            </span>
                            <span className="text-[10px] text-slate-400">
                            {format(parseISO(tx.date), 'yyyy')}
                            </span>
                        </div>

                        <div className="col-span-6 md:col-span-5">
                            <p className="font-semibold text-slate-800 text-sm truncate" title={tx.description}>
                            {tx.description}
                            </p>
                            {tx.category_id && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                                <Layers className="w-3 h-3" /> Categoria definida
                            </span>
                            )}
                        </div>

                        <div className="col-span-2 hidden md:flex items-center">
                            {tx.installment_total > 1 ? (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isCurrentMonth ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                {tx.installment_number}/{tx.installment_total}
                            </span>
                            ) : (
                            <span className="text-xs text-slate-300">-</span>
                            )}
                        </div>

                        <div className="col-span-3 md:col-span-2 text-right font-bold text-slate-900 text-sm">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                        </div>

                        <div className="col-span-1 text-right">
                            <button 
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                            >
                            <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        </div>
                    );
                    })}
                </div>
            </div>
            
            <div className="h-8"></div>
        </div>
      </div>

      {/* FOOTER FIXO */}
      <div className="bg-white border-t border-slate-200 p-4 md:px-8 pb-8 md:pb-6 shrink-0 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="hidden md:block">
            <span className="text-sm text-slate-500">
              Ao confirmar, <strong>{transactions.length}</strong> registros serão criados.
            </span>
          </div>
          <button 
            onClick={handleConfirmSave}
            disabled={loading}
            className="w-full md:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {loading ? 'Salvando...' : 'Salvar no Extrato'}
          </button>
        </div>
      </div>

    </div>
  );
}