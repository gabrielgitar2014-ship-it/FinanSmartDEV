import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Ticket, ArrowRight, Loader2, CheckCircle2, Building2, Mail, Lock, AlertCircle, MailCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import logo from '../assets/logo.png'

export default function InviteRegisterPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { signUpWithEmail } = useAuth()

  // --- ESTADOS DO FLUXO ---
  const [step, setStep] = useState('verify') // 'verify' | 'register'
  const [token, setToken] = useState('')
  const [inviteData, setInviteData] = useState(null)
  
  // --- ESTADOS DO FORMULÁRIO ---
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // --- ESTADOS DE CONTROLE ---
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  // 1. Auto-verificação se vier token na URL (ex: /invite?token=XYZ)
  useEffect(() => {
    const urlToken = searchParams.get('token')
    if (urlToken) {
      setToken(urlToken)
      handleVerifyToken(urlToken)
    }
  }, [])

  // 2. Validar Token e Buscar Dados do Convidado (RPC)
  const handleVerifyToken = async (tokenToVerify) => {
    if (!tokenToVerify) return
    setIsLoading(true)
    setError('')

    try {
      // Chama a função RPC segura no banco de dados
      const { data, error } = await supabase.rpc('rpc_get_invite_details', { _token: tokenToVerify })
      
      if (error) throw error

      if (data && data.is_valid) {
        setInviteData(data)
        
        // --- PREENCHIMENTO AUTOMÁTICO (AUTO-FILL) ---
        // Se o admin preencheu esses dados no convite, já trazemos para facilitar
        if (data.email_invited) setEmail(data.email_invited)
        if (data.first_name) setFirstName(data.first_name)
        if (data.last_name) setLastName(data.last_name)
        
        setStep('register')
      } else {
        setError('Este convite é inválido, expirou ou já foi usado.')
      }
    } catch (err) {
      console.error(err)
      setError('Erro ao validar convite. Verifique o código e tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // 3. Criar Conta e Salvar Intenção
  const handleRegister = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`
      
      // A) CRIA O USUÁRIO
      // O trigger no banco vai criar o profile automaticamente usando o full_name
      const { error: authError } = await signUpWithEmail(email, password, fullName)
      
      if (authError) throw authError

      // B) PERSISTÊNCIA CRÍTICA: Salvar token para pós-login
      // Como o usuário precisa sair para confirmar o e-mail, salvamos o token aqui.
      // O OnboardingPage vai ler isso quando ele voltar logado e fará o vínculo (Claim).
      localStorage.setItem('pendingInviteToken', token)

      // C) Sucesso! Mostra tela de verificação de email
      setIsSuccess(true)

    } catch (err) {
      if (err.message.includes('already registered')) {
        setError('Este e-mail já possui conta. Faça Login para aceitar o convite.')
      } else {
        setError(err.message || 'Erro ao processar cadastro.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden py-10">
      
      {/* Elementos de Fundo (Ambient Glow) */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-300/30 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-sky-300/20 rounded-full blur-[100px]" />

      <motion.div 
        layout
        className="w-full max-w-md px-6 relative z-10"
      >
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl p-8 shadow-xl shadow-slate-200/50 overflow-hidden">
          
          {/* Cabeçalho */}
          <div className="text-center mb-6">
             <motion.img src={logo} className="w-12 h-auto mx-auto mb-4" />
             <h1 className="text-xl font-bold text-slate-900">Entrar com Convite</h1>
          </div>

          <AnimatePresence mode="wait">
            
            {/* --- CENA DE SUCESSO (VERIFICAÇÃO DE EMAIL) --- */}
            {isSuccess ? (
               <motion.div 
                 key="success"
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="text-center"
               >
                 <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                   <MailCheck size={32} />
                 </div>
                 
                 <h2 className="text-lg font-bold text-slate-900 mb-2">Quase lá, {firstName}!</h2>
                 
                 <p className="text-slate-500 text-sm mb-4 leading-relaxed">
                   Enviamos um e-mail de confirmação para:<br/>
                   <strong>{email}</strong>
                 </p>
                 
                 <div className="bg-indigo-50 p-4 rounded-xl text-xs text-indigo-800 mb-6 text-left flex gap-2 items-start">
                   <AlertCircle size={14} className="mt-0.5 shrink-0" />
                   <span>
                     Por segurança, confirme seu e-mail antes de acessar os dados da família <strong>{inviteData?.household_name}</strong>.
                   </span>
                 </div>
                 
                 <Link to="/login" className="w-full block bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                   Ir para Login
                 </Link>
               </motion.div>
            ) : (
              
              /* --- CENA DE VERIFICAÇÃO DO TOKEN (Se não veio na URL) --- */
              step === 'verify' ? (
                <motion.div 
                  key="verify"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <p className="text-center text-slate-500 text-sm mb-4">
                    Insira o código de 6 dígitos que você recebeu.
                  </p>

                  {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2">
                      <AlertCircle size={14} /> {error}
                    </div>
                  )}

                  <div className="relative">
                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="text" 
                      value={token}
                      onChange={(e) => setToken(e.target.value.toUpperCase())}
                      placeholder="EX: A1B2C3"
                      className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 text-center tracking-[0.2em] font-mono text-lg text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase"
                      maxLength={6}
                    />
                  </div>

                  <button 
                    onClick={() => handleVerifyToken(token)}
                    disabled={isLoading || token.length < 6}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-70 transition-all"
                  >
                    {isLoading ? <Loader2 className="animate-spin" /> : 'Validar Código'}
                  </button>

                  <div className="text-center mt-4">
                    <Link to="/login" className="text-xs text-slate-500 hover:text-indigo-600">
                      Já tem conta? Faça login para resgatar
                    </Link>
                  </div>
                </motion.div>
              ) : (

                /* --- CENA DE REGISTRO (FORMULÁRIO PREENCHIDO) --- */
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onSubmit={handleRegister}
                  className="space-y-4"
                >
                  {/* Card de Feedback do Convite */}
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-green-600 shadow-sm">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Convite validado</p>
                      <p className="text-sm font-bold text-green-900">
                        Família {inviteData?.household_name}
                      </p>
                    </div>
                    <CheckCircle2 className="ml-auto text-green-500 w-5 h-5" />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2">
                      <AlertCircle size={14} /> {error}
                    </div>
                  )}

                  {/* Campos Nome/Sobrenome */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nome</label>
                      <input 
                        required 
                        value={firstName} 
                        onChange={e => setFirstName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="Nome"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Sobrenome</label>
                      <input 
                        required 
                        value={lastName} 
                        onChange={e => setLastName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="Sobrenome"
                      />
                    </div>
                  </div>

                  {/* Campo E-mail */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="email" 
                        required 
                        value={email} 
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Campo Senha */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Criar Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="password" 
                        required 
                        value={password} 
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 mt-4 shadow-lg shadow-indigo-500/30 transition-all"
                  >
                    {isLoading ? <Loader2 className="animate-spin" /> : (
                      <>Criar e Confirmar <ArrowRight size={16} /></>
                    )}
                  </button>
                </motion.form>
              )
            )}

          </AnimatePresence>
        </div>

        <div className="mt-6 text-center">
           <p className="text-slate-400 text-[10px] uppercase tracking-widest opacity-60">FinanSmart © 2025</p>
        </div>
      </motion.div>
    </div>
  )
}