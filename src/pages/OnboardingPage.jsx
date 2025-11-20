import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { 
  User, Users, ArrowRight, Loader2, Plus, X, 
  Wand2, Copy, Check, AlertCircle 
} from 'lucide-react';

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth(); 
  const navigate = useNavigate();
  
  const firstName = user?.user_metadata?.first_name || 'Usuário';
  const lastName = user?.user_metadata?.last_name || '';

  const [step, setStep] = useState('selection'); 
  const [loading, setLoading] = useState(false); // Loading geral (botão final)
  
  // Dados da Família
  const [familyName, setFamilyName] = useState('');
  const [householdId, setHouseholdId] = useState(null); // Guarda ID se já criado

  const [invites, setInvites] = useState([
    { email: '', name: '', token: '', loading: false }
  ]);

  const inputBaseClass = "w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/50";
  const labelBaseClass = "block text-sm font-bold text-slate-900 dark:text-slate-300 mb-2";

  // === HELPER: Finalizar Onboarding (Flag no Banco) ===
  const finalizeProfileSetup = async () => {
    // Marca explicitamente como completo
    const { error } = await supabase
      .from('profiles')
      .update({ profile_setup_complete: true })
      .eq('id', user.id);
    
    if (error) throw error;

    // Atualiza contexto para liberar rota
    await refreshProfile();
  };

  // === HELPER: Criar Família (Modo Rascunho) ===
  // Cria a estrutura mas NÃO chuta o usuário da tela
  const ensureHouseholdExists = async () => {
    if (householdId) return householdId;

    if (!familyName.trim()) {
      toast.error('Defina um nome para a família antes de gerar convites.');
      throw new Error('Nome da família obrigatório');
    }

    // Chama a nova função DRAFT (que não marca setup_complete = true)
    const { data: newId, error } = await supabase.rpc('create_household_draft', {
      p_first_name: firstName,
      p_last_name: lastName,
      p_nome_familia: familyName
    });
    
    if (error) throw error;
    
    setHouseholdId(newId);
    return newId;
  };

  // --- AÇÃO: Gerar Token ---
  const handleGenerateToken = async (index) => {
    const invite = invites[index];
    
    if (!invite.name || !invite.email) {
      toast.error('Preencha nome e email para gerar o convite.');
      return;
    }

    const newInvites = [...invites];
    newInvites[index].loading = true;
    setInvites(newInvites);

    try {
      // 1. Garante que família existe (sem sair da tela)
      const currentHouseholdId = await ensureHouseholdExists();

      // 2. Gera token
      const { data, error } = await supabase.functions.invoke('invite', {
        body: {
          household_id: currentHouseholdId,
          inviter_id: user.id,
          email: invite.email,
          guest_name: invite.name
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.message);

      newInvites[index].token = data.token;
      toast.success('Convite gerado com sucesso!');

    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar convite.');
    } finally {
      newInvites[index].loading = false;
      setInvites(newInvites);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Código copiado para área de transferência!');
  };

  // --- FINALIZAR: Uso Pessoal ---
  const handleSoloUse = async () => {
    setLoading(true);
    try {
      // Aqui usamos a função antiga ou fazemos manualmente
      // Como é uso pessoal, podemos criar e finalizar direto
      const autoFamilyName = `Família ${lastName || firstName}`;
      
      const { error } = await supabase.rpc('create_household_draft', {
        p_first_name: firstName,
        p_last_name: lastName,
        p_nome_familia: autoFamilyName
      });
      
      if (error) throw error;

      await finalizeProfileSetup();
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao configurar perfil.');
    } finally {
      setLoading(false);
    }
  };

  // --- FINALIZAR: Uso Família ---
  const handleFinishFamily = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Se ainda não criou a família (não gerou tokens), cria agora
      if (!householdId) {
        const { error } = await supabase.rpc('create_household_draft', {
          p_first_name: firstName,
          p_last_name: lastName,
          p_nome_familia: familyName
        });
        if (error) throw error;
      }

      // AGORA SIM: Finaliza o setup e libera o acesso
      await finalizeProfileSetup();
      
      toast.success('Tudo pronto!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao finalizar configuração.');
    } finally {
      setLoading(false);
    }
  };

  const addInviteField = () => setInvites([...invites, { email: '', name: '', token: '', loading: false }]);
  const removeInviteField = (idx) => setInvites(invites.filter((_, i) => i !== idx));
  const updateInvite = (idx, field, value) => {
    const newInvites = [...invites];
    newInvites[idx][field] = value;
    setInvites(newInvites);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="p-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Olá, {firstName}! 👋
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Vamos configurar o FindingSmart. Qual seu objetivo?
          </p>
        </div>

        {step === 'selection' && (
          <div className="p-8 pt-0 grid md:grid-cols-2 gap-4">
            <button 
              onClick={handleSoloUse}
              disabled={loading}
              className="flex flex-col items-center text-center gap-4 p-6 rounded-xl border-2 border-slate-100 dark:border-slate-800 hover:border-sky-500 bg-white dark:bg-slate-800/50 transition-all group hover:shadow-md"
            >
              <div className="p-4 bg-blue-100 text-blue-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <User size={32} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Uso Pessoal</h3>
                <p className="text-sm text-slate-500">Apenas minhas finanças.</p>
              </div>
            </button>

            <button 
              onClick={() => setStep('family-setup')}
              disabled={loading}
              className="flex flex-col items-center text-center gap-4 p-6 rounded-xl border-2 border-slate-100 dark:border-slate-800 hover:border-emerald-500 bg-white dark:bg-slate-800/50 transition-all group hover:shadow-md"
            >
              <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Users size={32} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Uso em Família</h3>
                <p className="text-sm text-slate-500">Com cônjuge ou filhos.</p>
              </div>
            </button>
          </div>
        )}

        {step === 'family-setup' && (
          <form onSubmit={handleFinishFamily} className="p-8 pt-0 space-y-6">
            
            {/* Nome da Família */}
            <div>
              <label className={labelBaseClass}>Nome da Família</label>
              <input 
                type="text" 
                required
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                disabled={!!householdId} 
                className={inputBaseClass}
                placeholder={`Ex: Família ${lastName || firstName}`}
              />
              {householdId && <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1 font-medium"><Check size={14}/> Família criada com sucesso</p>}
            </div>

            {/* Lista de Convites */}
            <div className="space-y-4">
              <label className={labelBaseClass}>Membros da Família</label>
              
              {invites.map((invite, index) => (
                <div key={index} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 animate-in fade-in">
                  
                  <div className="flex flex-col md:flex-row gap-3 mb-3">
                    <input 
                      type="text" 
                      placeholder="Nome completo do convidado"
                      value={invite.name}
                      onChange={(e) => updateInvite(index, 'name', e.target.value)}
                      disabled={!!invite.token} 
                      className={`${inputBaseClass} py-2 text-sm`}
                    />
                    <input 
                      type="email" 
                      placeholder="Email do Convidado"
                      value={invite.email}
                      onChange={(e) => updateInvite(index, 'email', e.target.value)}
                      disabled={!!invite.token}
                      className={`${inputBaseClass} py-2 text-sm`}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    {invite.token ? (
                      // ESTADO: TOKEN GERADO (Com botão de cópia)
                      <div className="flex-1 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-2 px-3">
                        <div className="flex-1 font-mono text-lg font-bold text-emerald-700 dark:text-emerald-400 tracking-widest text-center select-all">
                          {invite.token}
                        </div>
                        <button 
                          type="button"
                          onClick={() => copyToClipboard(invite.token)}
                          className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded text-emerald-700 dark:text-emerald-400 transition-colors"
                          title="Copiar Código"
                        >
                          <Copy size={18} />
                        </button>
                      </div>
                    ) : (
                      // ESTADO: BOTÃO GERAR
                      <div className="flex-1 flex gap-3">
                        <button 
                          type="button"
                          onClick={() => handleGenerateToken(index)}
                          disabled={invite.loading || !invite.name || !invite.email}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900 disabled:opacity-50 transition-colors shadow-sm"
                        >
                          {invite.loading ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16} />}
                          Gerar Código
                        </button>
                        
                        {invites.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removeInviteField(index)} 
                            className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {invite.token && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                      <AlertCircle size={12}/> Copie e envie este código para {invite.name.split(' ')[0]}.
                    </p>
                  )}
                </div>
              ))}

              <button type="button" onClick={addInviteField} className="text-sm text-sky-600 font-medium flex items-center gap-1 hover:underline">
                <Plus size={16} /> Adicionar outro membro
              </button>
            </div>

            {/* Rodapé de Ação */}
            <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button 
                type="button" 
                onClick={() => setStep('selection')} 
                className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Voltar
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex justify-center items-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none"
              >
                {loading ? <Loader2 className="animate-spin"/> : 'Finalizar e Entrar'} 
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}