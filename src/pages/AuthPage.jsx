import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { 
  Mail, Lock, User, ArrowRight, Loader2, KeyRound, CheckCircle2, Send 
} from 'lucide-react';

import logoImg from '../assets/logo.png';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get('token');

  // === ESTADOS DE CONTROLE ===
  const [isLogin, setIsLogin] = useState(location.pathname === '/login');
  const [showTokenInput, setShowTokenInput] = useState(!!urlToken);
  const [inviteToken, setInviteToken] = useState(urlToken || '');
  const [inviteData, setInviteData] = useState(null); 
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // === FORMULÁRIO ===
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  
  // Opcional: erro visual no form (além do toast)
  const [error, setError] = useState('');

  // ✨ IMPORTANTE: Pegamos o refreshProfile do contexto
  const { signIn, signUp, refreshProfile } = useAuth();

  // 1. Reseta estados ao navegar
  useEffect(() => {
    const targetIsLogin = location.pathname === '/login';
    setIsLogin(targetIsLogin);
    setError('');
    setEmailSent(false);
    
    if (targetIsLogin) {
      setShowTokenInput(false);
      setInviteData(null);
      setInviteToken('');
    }
  }, [location.pathname]);

  // 2. Validação automática via URL
  useEffect(() => {
    if (urlToken) {
      setIsLogin(false);
      setShowTokenInput(true);
      verifyToken(urlToken);
    }
  }, [urlToken]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // === LÓGICA DE TOKEN ===
  const verifyToken = async (token) => {
    if (!token) return;
    setIsVerifyingToken(true);
    setError('');
    const toastId = toast.loading('Validando convite...');

    try {
      const { data, error } = await supabase.rpc('get_invite_details', { p_token: token });
      
      if (error) throw error;

      if (data && data.valid) {
        setInviteData(data);
        
        // Preenche form automaticamente
        setFormData(prev => ({ 
          ...prev, 
          email: data.email,
          firstName: data.guest_name ? data.guest_name.split(' ')[0] : prev.firstName,
          lastName: data.guest_name ? data.guest_name.split(' ').slice(1).join(' ') : prev.lastName
        }));
        
        setInviteToken(token);
        setIsLogin(false); // Garante tela de registro
        toast.success('Convite encontrado!', { id: toastId });
      } else {
        toast.error('Código inválido.', { id: toastId });
        setInviteData(null);
        setError('Código inválido ou expirado.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao validar.', { id: toastId });
    } finally {
      setIsVerifyingToken(false);
    }
  };

  // === SUBMIT (LOGIN OU REGISTRO) ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const loadingMsg = isLogin ? 'Entrando...' : 'Processando cadastro...';
    const toastId = toast.loading(loadingMsg);

    try {
      if (isLogin) {
        // --- LOGIN ---
        const { error } = await signIn(formData.email, formData.password);
        if (error) throw error;

        // Se logou e tinha convite pendente, tenta aceitar
        if (inviteData && inviteData.valid) {
           try {
             await supabase.rpc('join_household_with_token', {
                p_first_name: formData.firstName, // Idealmente usaria dados do profile já existente
                p_last_name: formData.lastName,
                p_invite_token: inviteToken
             });
             
             // Atualiza contexto para liberar acesso
             await refreshProfile();
             
             toast.success('Login realizado e convite aceito!', { id: toastId });
           } catch (inviteErr) {
             console.error("Erro convite pós-login", inviteErr);
             toast.success('Login realizado!', { id: toastId });
           }
        } else {
           toast.success('Bem-vindo de volta!', { id: toastId });
        }
        navigate('/dashboard'); 

      } else {
        // --- REGISTRO ---
        const { data: authData, error: authError } = await signUp(
          formData.email, 
          formData.password, 
          {
            first_name: formData.firstName,
            last_name: formData.lastName
          }
        );
        
        if (authError) throw authError;

        // ⚠️ PROTEÇÃO DE SESSÃO
        // Se não tem sessão, o usuário precisa confirmar e-mail.
        if (!authData?.session) {
            toast.dismiss(toastId);
            setEmailSent(true); // Mostra tela de "Verifique seu email"
            setLoading(false);
            return; // Para aqui
        }

        // Se tem sessão (auto-confirm), prossegue:
        if (inviteData && inviteData.valid) {
          // === CENÁRIO: CONVIDADO (GUEST) ===
          const { error: rpcError } = await supabase.rpc('join_household_with_token', {
            p_first_name: formData.firstName,
            p_last_name: formData.lastName,
            p_invite_token: inviteToken
          });
          
          if (rpcError) throw rpcError;
          
          // Força atualização do perfil (agora profile_setup_complete = true)
          await refreshProfile();

          toast.success('Convite aceito com sucesso!', { id: toastId });
          
          // Redireciona direto para Dashboard (Pula Onboarding)
          navigate('/dashboard');
          
        } else {
          // === CENÁRIO: NOVO ADMIN (SEM CONVITE) ===
          toast.success('Conta criada!', { id: toastId });
          navigate('/onboarding');
        }
      }
    } catch (err) {
      console.error(err);
      const msg = err.message || 'Erro ao processar.';
      toast.error(msg, { id: toastId });
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // === TELA DE EMAIL ENVIADO ===
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Send size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Verifique seu E-mail</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            Enviamos um link de confirmação para: <br/>
            <strong className="text-slate-900 dark:text-white">{formData.email}</strong>
          </p>
          <button 
            onClick={() => { 
              setEmailSent(false); 
              setIsLogin(true); 
              navigate('/login'); 
            }} 
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition-colors"
          >
            Voltar para Login
          </button>
        </div>
      </div>
    );
  }

  // === LÓGICA VISUAL DO HEADER ===
  const getHeaderInfo = () => {
    // 1. Convite Encontrado
    if (inviteData) {
      return {
        title: 'Convite Encontrado!',
        subtitle: `Você foi convidado para a hub inteligente de gerenciamento financeiro por ${inviteData.inviter_name || 'um usuário'}.`,
        icon: <CheckCircle2 size={32} />,
        iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 p-3',
        useImage: false
      };
    }
    // 2. Inserir Código Manualmente
    if (showTokenInput && !isLogin) {
      return {
        title: 'Tenho um Código',
        subtitle: 'Insira o token recebido para entrar na família.',
        icon: <KeyRound size={32} />,
        iconBg: 'bg-slate-800 text-white p-3',
        useImage: false
      };
    }
    // 3. Login
    if (isLogin) {
      return {
        title: 'Bem-vindo de volta',
        subtitle: 'Acesse seu hub financeiro inteligente.',
        useImage: true 
      };
    }
    // 4. Registro Padrão
    return {
      title: 'Criar Conta',
      subtitle: 'Comece seu controle financeiro hoje.',
      useImage: true
    };
  };

  const headerInfo = getHeaderInfo();
  
  // Classes de estilo (Sólido)
  const inputBaseClass = "w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all placeholder:text-slate-400";
  const labelBaseClass = "block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1.5";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
        
        {/* HEADER */}
        <div className="p-8 text-center bg-gradient-to-b from-sky-50 to-white dark:from-slate-800 dark:to-slate-900">
          <div className="mx-auto mb-6 flex justify-center">
            {headerInfo.useImage ? (
              <img 
                src={logoImg} 
                alt="FinanSmart" 
                className="w-24 h-24 rounded-2xl shadow-lg shadow-blue-900/20 hover:scale-105 transition-transform duration-300" 
              />
            ) : (
              <div className={`rounded-2xl flex items-center justify-center shadow-lg shadow-black/5 dark:shadow-none ${headerInfo.iconBg}`}>
                {headerInfo.icon}
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {headerInfo.title}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm font-medium px-4 leading-relaxed">
            {headerInfo.subtitle}
          </p>
        </div>

        <div className="p-8 pt-0 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-lg border border-rose-100 font-medium animate-in fade-in">
              {error}
            </div>
          )}

          {/* INPUT DE TOKEN (Se necessário) */}
          {showTokenInput && !inviteData && !isLogin && (
            <div className="flex gap-2 animate-in fade-in slide-in-from-right-4">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-3 text-slate-500" size={18} />
                <input 
                  type="text" 
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  className={`${inputBaseClass} pl-10 uppercase`}
                  placeholder="CÓDIGO"
                />
              </div>
              <button 
                onClick={() => verifyToken(inviteToken)}
                disabled={isVerifyingToken || !inviteToken}
                className="px-5 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-50 shadow-md"
              >
                {isVerifyingToken ? <Loader2 size={18} className="animate-spin"/> : 'Verificar'}
              </button>
            </div>
          )}

          {/* FORMULÁRIO PRINCIPAL */}
          {(isLogin || (!showTokenInput) || inviteData) && (
            <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Nome/Sobrenome (Apenas Registro) */}
              {!isLogin && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className={labelBaseClass}>Nome</label>
                    <input 
                      name="firstName" 
                      type="text" 
                      required 
                      value={formData.firstName} 
                      onChange={handleInputChange} 
                      className={inputBaseClass} 
                      placeholder="Ex: João" 
                    />
                  </div>
                  <div className="flex-1">
                    <label className={labelBaseClass}>Sobrenome</label>
                    <input 
                      name="lastName" 
                      type="text" 
                      required 
                      value={formData.lastName} 
                      onChange={handleInputChange} 
                      className={inputBaseClass} 
                      placeholder="Ex: Silva" 
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className={labelBaseClass}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                  <input 
                    name="email" 
                    type="email" 
                    required 
                    value={formData.email} 
                    onChange={handleInputChange} 
                    className={`${inputBaseClass} pl-10 ${inviteData ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:text-emerald-100' : ''}`} 
                    placeholder="seu@email.com" 
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label className={labelBaseClass}>Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                  <input 
                    name="password" 
                    type="password" 
                    required 
                    value={formData.password} 
                    onChange={handleInputChange} 
                    className={`${inputBaseClass} pl-10`} 
                    placeholder="••••••••" 
                  />
                </div>
              </div>

              {/* BOTÃO DE AÇÃO */}
              <button 
                type="submit" 
                disabled={loading}
                className={`w-full py-3 text-white rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 transform active:scale-[0.98] ${
                  inviteData 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none' // Verde para convite
                    : 'bg-sky-600 hover:bg-sky-700 shadow-sky-200 dark:shadow-none' // Azul padrão
                }`}
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : (
                  <>
                    {isLogin 
                      ? 'Entrar na Conta' 
                      : (inviteData ? 'Aceitar e Criar Conta' : 'Criar Conta')
                    }
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* RODAPÉ DE NAVEGAÇÃO */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
            
            <div className="text-center">
              <button 
                type="button"
                onClick={() => {
                  if(isLogin) navigate('/register'); else navigate('/login');
                  setShowTokenInput(false);
                  setInviteData(null);
                  setInviteToken('');
                }}
                className="text-sm text-slate-700 dark:text-slate-400 hover:text-sky-600 font-semibold transition-colors"
              >
                {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça Login'}
              </button>
            </div>

            {!isLogin && !inviteData && (
              <div className="text-center">
                {!showTokenInput ? (
                  <button 
                    onClick={() => setShowTokenInput(true)} 
                    className="text-xs text-sky-600 hover:text-sky-700 hover:underline font-medium"
                  >
                    Tenho um código de convite
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowTokenInput(false)} 
                    className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
                  >
                    Voltar para cadastro normal
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}