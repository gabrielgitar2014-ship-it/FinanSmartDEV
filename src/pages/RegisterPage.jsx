import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Loader2, User, Eye, EyeOff, Check, AlertCircle, MailCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.png'

export default function RegisterPage() {
  // Estados dos Campos
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Estados de Controle Visual
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  
  // --- NOVO ESTADO: SUCESSO ---
  const [isSuccess, setIsSuccess] = useState(false)

  const { signUpWithEmail } = useAuth()

  // Cálculo de Força da Senha
  useEffect(() => {
    let score = 0
    if (password.length > 0) {
      if (password.length >= 8) score += 1
      if (/[A-Z]/.test(password)) score += 1
      if (/[0-9]/.test(password)) score += 1
      if (/[^A-Za-z0-9]/.test(password)) score += 1
    }
    setPasswordStrength(score)
  }, [password])

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-400'
    if (passwordStrength === 2) return 'bg-orange-400'
    if (passwordStrength === 3) return 'bg-yellow-400'
    return 'bg-green-500'
  }
  
  const getStrengthLabel = () => {
    if (passwordStrength === 0) return ''
    if (passwordStrength <= 2) return 'Fraca'
    if (passwordStrength === 3) return 'Média'
    return 'Forte'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      setIsSubmitting(false)
      return
    }

    if (passwordStrength < 2) {
      setError('Sua senha é muito fraca.')
      setIsSubmitting(false)
      return
    }

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`
      const { error } = await signUpWithEmail(email, password, fullName)
      
      if (error) throw error
      
      // SUCESSO! Mostra a tela de verificação
      setIsSuccess(true)
      
    } catch (err) {
      if (err.message.includes('already registered')) {
        setError('Este e-mail já está em uso.')
      } else {
        setError('Erro ao criar conta. Tente novamente.')
      }
      setIsSubmitting(false)
    }
  }

  // --- RENDERIZAÇÃO ---
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden py-10">
      
      {/* Ambient Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-300/30 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-300/20 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md px-6 relative z-10"
      >
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl p-8 shadow-xl shadow-slate-200/50">
          
          {/* --- CENÁRIO 1: TELA DE SUCESSO (VERIFICAÇÃO) --- */}
          {isSuccess ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6 text-sky-600 shadow-sm">
                <MailCheck size={40} />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Verifique seu e-mail</h2>
              
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Enviamos um link de confirmação para:<br/>
                <span className="font-bold text-slate-800">{email}</span>
              </p>

              <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 mb-8 text-left">
                <p className="text-xs text-sky-700 flex gap-2 items-start">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    <strong>Importante:</strong> Sua conta só será ativada após clicar no link. Verifique também sua caixa de Spam.
                  </span>
                </p>
              </div>

              <Link 
                to="/login"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Voltar para Login
              </Link>
            </motion.div>
          ) : (
            
            /* --- CENÁRIO 2: FORMULÁRIO DE CADASTRO --- */
            <>
              <div className="text-center mb-6">
                <motion.img src={logo} className="w-16 h-auto mx-auto mb-4 drop-shadow-md" />
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Criar sua conta</h1>
                <p className="text-slate-500 mt-1 text-sm">Comece a controlar suas finanças hoje.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs flex items-center gap-2"
                  >
                    <AlertCircle size={14} />
                    {error}
                  </motion.div>
                )}

                <div className="flex gap-3">
                  <div className="space-y-1 w-1/2">
                    <label className="text-xs font-medium text-slate-600 ml-1">Nome</label>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                      <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-9 pr-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all" placeholder="Ex: Gabriel" required />
                    </div>
                  </div>
                  <div className="space-y-1 w-1/2">
                    <label className="text-xs font-medium text-slate-600 ml-1">Sobrenome</label>
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all" placeholder="Silva" required />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 ml-1">E-mail</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-9 pr-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all" placeholder="seu@email.com" required />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 ml-1 flex justify-between">
                    <span>Senha</span>
                    <span className={`font-bold ${passwordStrength >= 3 ? 'text-green-600' : 'text-slate-400'}`}>{getStrengthLabel()}</span>
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-9 pr-10 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all" placeholder="Mínimo 8 caracteres" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="flex gap-1 mt-2 h-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div key={level} className={`h-full flex-1 rounded-full transition-all duration-300 ${passwordStrength >= level ? getStrengthColor() : 'bg-slate-200'}`} />
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 ml-1">Confirmar Senha</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full bg-white border rounded-xl py-3 pl-9 pr-4 text-sm text-slate-900 focus:outline-none focus:ring-2 transition-all ${confirmPassword && password !== confirmPassword ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200 focus:ring-sky-500/20 focus:border-sky-500'}`} placeholder="Repita a senha" required />
                    {confirmPassword && password === confirmPassword && (
                       <Check className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 w-4 h-4" />
                    )}
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/30 disabled:opacity-70 disabled:cursor-not-allowed mt-4 cursor-pointer">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Criar Conta <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              <div className="mt-6 text-center pt-6 border-t border-slate-200">
                <p className="text-slate-500 text-sm">Já tem uma conta? <Link to="/login" className="text-sky-600 font-semibold hover:text-sky-500 transition-colors">Fazer login</Link></p>
              </div>
            </>
          )}

        </div>
        <div className="mt-6 text-center"><p className="text-slate-400 text-[10px] uppercase tracking-widest opacity-60">FindingSmart © 2025</p></div>
      </motion.div>
    </div>
  )
}