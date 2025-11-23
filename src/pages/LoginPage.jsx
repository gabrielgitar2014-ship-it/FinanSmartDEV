import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Loader2, Ticket } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.png'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { signInWithEmail, user } = useAuth() // NOVO: Importamos 'user' para verificar status
  const navigate = useNavigate()

  // NOVO: Se o usuário já estiver logado, manda para o Dashboard (que decide se vai pro Onboarding)
  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const { error } = await signInWithEmail(email, password)
      
      if (error) {
        // Tratamento específico para "Email não confirmado"
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Verifique seu e-mail para ativar a conta.')
        }
        if (error.message.includes('Invalid login')) {
          throw new Error('E-mail ou senha incorretos.')
        }
        throw error
      }

      // NOVO: Sucesso! Força a navegação
      // Não precisamos setar isSubmitting(false) porque a página vai desmontar
      navigate('/dashboard')

    } catch (err) {
      setError(err.message || 'Erro ao fazer login.')
      setIsSubmitting(false) // Para o spinner apenas se der erro
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden">
      
      {/* Elementos de Fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-300/30 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-300/20 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md px-6 relative z-10"
      >
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl p-8 shadow-xl shadow-slate-200/50">
          
          {/* Cabeçalho */}
          <div className="text-center mb-8">
            <motion.img 
              src={logo}
              alt="FindingSmart Logo"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
              className="w-24 h-auto mx-auto mb-6 drop-shadow-lg" 
            />
            
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bem-vindo de volta</h1>
            <p className="text-slate-500 mt-2 text-sm">Gerencie suas finanças com inteligência.</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs flex items-center gap-2"
              >
                <span className="w-1 h-1 rounded-full bg-red-500" />
                {error}
              </motion.div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 ml-1">E-mail</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-medium text-slate-600">Senha</label>
                <Link to="/forgot-password" className="text-xs text-sky-600 hover:text-sky-500 transition-colors font-medium">
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/30 disabled:opacity-70 disabled:cursor-not-allowed mt-2 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Entrar <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              Ainda não tem conta?{' '}
              <Link to="/register" className="text-sky-600 font-semibold hover:text-sky-500 transition-colors">
                Criar conta
              </Link>
            </p>
          </div>

          {/* Card de Convite */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 pt-6 border-t border-slate-200"
          >
            <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-4 flex items-center gap-4 hover:bg-indigo-50 transition-colors group">
              <div className="w-10 h-10 rounded-full bg-white text-indigo-500 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <Ticket size={18} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-indigo-900">Recebeu um convite?</p>
                <p className="text-[10px] text-indigo-600/80 leading-tight mt-0.5">
                  Cadastre-se para ativar seu código e entrar na família.
                </p>
              </div>
              <Link 
                to="/invite" 
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white px-3 py-2 rounded-lg shadow-sm border border-indigo-100 hover:shadow-md transition-all"
              >
                Resgatar
              </Link>
            </div>
          </motion.div>

        </div>
        
        <div className="mt-6 text-center">
           <p className="text-slate-400 text-[10px] uppercase tracking-widest opacity-60">FindingSmart © 2025</p>
        </div>

      </motion.div>
    </div>
  )
}