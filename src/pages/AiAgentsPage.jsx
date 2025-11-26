import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, FileText, Target, Sparkles, ArrowRight, 
  Zap, BrainCircuit, Lock, ShieldCheck 
} from 'lucide-react';

export default function AiAgentsPage() {
  const navigate = useNavigate();

  const agents = [
    {
      id: 'invoice-reader',
      title: 'Leitor de Faturas PDF',
      description: 'Importe faturas do Itaú, Bradesco ou Nubank. Nossa IA extrai, categoriza e ignora lançamentos futuros automaticamente.',
      icon: FileText,
      color: 'from-blue-500 to-cyan-400',
      shadow: 'shadow-blue-500/20',
      status: 'Disponível',
      statusColor: 'bg-green-500',
      action: () => navigate('/ai-agents/invoice-import') // Rota futura
    },
    {
      id: 'goal-advisor',
      title: 'Agente de Metas',
      description: 'Um consultor pessoal que analisa seus gastos e sugere cortes inteligentes para atingir seus objetivos mais rápido.',
      icon: Target,
      color: 'from-emerald-500 to-teal-400',
      shadow: 'shadow-emerald-500/20',
      status: 'Em Breve',
      statusColor: 'bg-amber-500',
      action: null // Desabilitado por enquanto
    },
    {
      id: 'smart-insights',
      title: 'FinanSmart Brain',
      description: 'Análise preditiva do seu fluxo de caixa. Receba alertas antes de entrar no vermelho.',
      icon: BrainCircuit,
      color: 'from-violet-600 to-fuchsia-500',
      shadow: 'shadow-violet-500/20',
      status: 'Em Desenvolvimento',
      statusColor: 'bg-slate-500',
      action: null
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* === HERO SECTION === */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 dark:bg-black p-8 md:p-12 text-white shadow-2xl border border-slate-800">
        {/* Background Effects */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-indigo-600 rounded-full blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-violet-600 rounded-full blur-3xl opacity-30"></div>
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3 h-3" /> FinanSmart AI 2.0
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Seus Assistentes Financeiros Inteligentes.
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            Automatize a gestão do seu dinheiro. Deixe que nossos agentes processem faturas, analisem tendências e otimizem seus gastos enquanto você vive.
          </p>
          
          <div className="flex flex-wrap gap-6 text-sm font-medium text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-400" /> Dados Criptografados
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" /> Processamento em Tempo Real
            </div>
          </div>
        </div>
      </div>

      {/* === AGENTS GRID === */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-600" />
          Agentes Disponíveis
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <div 
              key={agent.id}
              onClick={agent.status === 'Disponível' ? agent.action : undefined}
              className={`
                group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm 
                transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${agent.status === 'Disponível' ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}
              `}
            >
              {/* Hover Gradient Border Effect */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${agent.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>

              {/* Header do Card */}
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${agent.color} ${agent.shadow} flex items-center justify-center text-white transform group-hover:scale-110 transition-transform duration-300`}>
                  <agent.icon className="w-7 h-7" />
                </div>
                <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${agent.statusColor} animate-pulse`}></span>
                  {agent.status}
                </span>
              </div>

              {/* Conteúdo */}
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 transition-colors">
                {agent.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 min-h-[60px]">
                {agent.description}
              </p>

              {/* Footer / Action */}
              <div className="flex items-center text-sm font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                {agent.status === 'Disponível' ? (
                  <>
                    Acessar Agente <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Bloqueado
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}