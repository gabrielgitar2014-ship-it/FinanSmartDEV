import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  Calendar,
  ArrowLeft,
  ArrowRight,
  Plus
} from 'lucide-react';

// Hooks e Utils
import { useTransactions } from '../hooks/useTransactions';
import { useAccounts } from '../hooks/useAccounts';
import { formatCurrency, formatDate } from '../utils/format';

export default function DashboardPage() {
  // 1. Consumindo os dados reais do Supabase
  const { 
    transactions, 
    loading: loadingTx, 
    dateFilter 
  } = useTransactions();
  
  const { 
    accounts, 
    loading: loadingAcc 
  } = useAccounts();

  // 2. Cálculos em Tempo Real (Memoized para performance)
  const summary = useMemo(() => {
    const income = transactions
      .filter(t => t.tipo === 'income')
      .reduce((acc, t) => acc + Number(t.valor), 0);

    const expense = transactions
      .filter(t => t.tipo === 'expense')
      .reduce((acc, t) => acc + Number(t.valor), 0);

    const balance = income - expense;

    return { income, expense, balance };
  }, [transactions]);

  // Estado de Carregamento (Skeleton simples)
  if (loadingTx || loadingAcc) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  // Lista de meses para exibição amigável
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="space-y-8">
      
      {/* === CABEÇALHO COM FILTRO DE DATA === */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Visão Geral</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Resumo financeiro de {monthNames[dateFilter.month - 1]} de {dateFilter.year}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <button 
            onClick={dateFilter.prevMonth}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="flex items-center gap-2 px-2 min-w-[140px] justify-center font-medium">
            <Calendar size={18} className="text-sky-500" />
            <span>{monthNames[dateFilter.month - 1]} {dateFilter.year}</span>
          </div>

          <button 
            onClick={dateFilter.nextMonth}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* === CARDS DE RESUMO (KPIs) === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card: Entradas */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="p-6 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Entradas</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(summary.income)}
              </h3>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={24} />
            </div>
          </div>
        </motion.div>

        {/* Card: Saídas */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="p-6 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Saídas</p>
              <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(summary.expense)}
              </h3>
            </div>
            <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400">
              <TrendingDown size={24} />
            </div>
          </div>
        </motion.div>

        {/* Card: Balanço Mensal */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="p-6 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Saldo do Mês</p>
              <h3 className={`text-2xl font-bold mt-1 ${summary.balance >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatCurrency(summary.balance)}
              </h3>
            </div>
            <div className="p-3 bg-sky-100 dark:bg-sky-900/30 rounded-xl text-sky-600 dark:text-sky-400">
              <DollarSign size={24} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* === CONTEÚDO PRINCIPAL === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA: ÚLTIMAS TRANSAÇÕES (2/3 da tela) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Transações Recentes</h3>
            <button className="text-sm font-medium text-sky-600 hover:text-sky-700">Ver todas</button>
          </div>

          <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p>Nenhuma transação encontrada neste mês.</p>
                <button className="mt-4 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-700">
                  Adicionar Transação
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.map((t) => (
                  <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                      {/* Ícone da Categoria (Fallback visual) */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        t.tipo === 'expense' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                         {/* Se tivéssemos o ícone salvo, usaríamos aqui. Usando genérico por enquanto */}
                         {t.tipo === 'expense' ? <TrendingDown size={18}/> : <TrendingUp size={18}/>}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{t.descricao}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{t.categories?.nome || 'Sem Categoria'}</span>
                          <span>•</span>
                          <span>{formatDate(t.data)}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`font-bold ${
                      t.tipo === 'expense' ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      {t.tipo === 'expense' ? '-' : '+'}{formatCurrency(t.valor)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: MINHAS CONTAS (1/3 da tela) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Minhas Contas</h3>
            <button className="p-1 hover:bg-slate-100 rounded-full text-sky-600"><Plus size={20}/></button>
          </div>

          <div className="space-y-3">
            {accounts.length === 0 ? (
               <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center text-sm text-slate-400">
                 Nenhuma conta cadastrada.
               </div>
            ) : (
              accounts.map((acc) => (
                <div key={acc.id} className="p-4 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                      <Wallet size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">{acc.nome}</p>
                      <p className="text-xs text-slate-400 capitalize">{acc.tipo}</p>
                    </div>
                  </div>
                  {/* Nota: Saldo Inicial mostrado aqui. Futuramente calcularemos o saldo real somando transações */}
                  <span className="font-bold text-slate-800 dark:text-white">
                    {formatCurrency(acc.saldo_inicial)}
                  </span>
                </div>
              ))
            )}
          </div>
          
          {/* Card de Ação Rápida (Placeholder para IA) */}
          <div className="p-5 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="font-bold text-lg mb-1">Insights IA</h4>
              <p className="text-indigo-100 text-sm mb-3">Sua saúde financeira está estável este mês.</p>
              <button className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors backdrop-blur-sm">
                Ver Análise
              </button>
            </div>
            <div className="absolute right-0 bottom-0 opacity-20 transform translate-x-2 translate-y-2">
              <Bot size={80} />
            </div>
          </div>

        </div>
      </div>

      {/* Botão Flutuante de Adicionar (Mobile) */}
      <button className="lg:hidden fixed bottom-20 right-4 w-14 h-14 bg-sky-600 text-white rounded-full shadow-lg flex items-center justify-center z-40 hover:bg-sky-700 transition-colors">
        <Plus size={28} />
      </button>
    </div>
  );
}

// Import necessário do ícone que faltou lá em cima no código
import { Bot } from 'lucide-react';