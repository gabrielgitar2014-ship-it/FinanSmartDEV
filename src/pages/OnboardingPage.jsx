import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowRight, Check, Building2, User, ChevronRight, 
  Sparkles, ShieldCheck, Zap, Loader2, Copy, Share2, Users, Plus, Smile 
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import logo from '../assets/logo.png'

export default function OnboardingPage() {
  const { profile, updateProfileLocal } = useAuth() // <--- Use updateProfileLocal
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [flowType, setFlowType] = useState('loading') 
  const [guestData, setGuestData] = useState(null)

  const [step, setStep] = useState(0)
  const [intent, setIntent] = useState(null)
  const [familyName, setFamilyName] = useState('')
  const [createdHousehold, setCreatedHousehold] = useState(null)
  const [invitesList, setInvitesList] = useState([])
  const [newInvite, setNewInvite] = useState({ firstName: '', lastName: '', email: '' })
  const [inviteLoading, setInviteLoading] = useState(false)

  // --- VERIFICAÇÃO INICIAL ---
  useEffect(() => {
    // Se o perfil já diz que completou, sai imediatamente
    if (profile?.onboarding_completed) {
      navigate('/dashboard', { replace: true })
      return
    }

    const checkScenario = async () => {
      try {
        const pendingToken = localStorage.getItem('pendingInviteToken')
        
        const { data: claimData, error: claimError } = await supabase.functions.invoke('claim-invite', {
          body: { token: pendingToken || null }
        })

        if (!claimError && claimData?.success) {
          localStorage.removeItem('pendingInviteToken')
          const { data: houseData } = await supabase.from('households').select('name').eq('id', claimData.household_id).single()
          setGuestData({ householdName: houseData?.name || 'Sua nova família' })
          setFlowType('guest')
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } })
          return
        } 
        
        const { data: memberData } = await supabase.from('household_members').select('role, households(name)').eq('user_id', profile.id).maybeSingle()

        if (memberData) {
          if (memberData.role === 'owner') {
             setFlowType('admin') 
          } else {
             setGuestData({ householdName: memberData.households?.name })
             setFlowType('guest') 
          }
        } else {
          setFlowType('admin') 
        }

      } catch (error) {
        console.error('Erro checkScenario:', error)
        setFlowType('admin')
      }
    }

    if (profile && !profile.onboarding_completed) {
      checkScenario()
    }
  }, [profile, navigate])


  // --- AÇÃO DE SAÍDA SEGURA (OTIMISTA) ---
  const finalizeAndGoToDashboard = async () => {
    // 1. Avisa o app localmente que terminou (Instantâneo)
    updateProfileLocal({ onboarding_completed: true })
    
    // 2. Navega (O PrivateRoute agora vai deixar passar)
    navigate('/dashboard', { replace: true })
  }

  // --- HANDLERS GUEST ---
  const handleFinishGuest = async () => {
    setLoading(true)
    try {
      // Atualiza no Banco (Background)
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', profile.id)
      
      // Sai com segurança
      await finalizeAndGoToDashboard()

    } catch (error) {
      console.error("Erro update guest:", error)
      // Mesmo com erro de rede, tenta avançar se possível
      await finalizeAndGoToDashboard()
    }
  }

  // --- HANDLERS ADMIN ---
  const handleCompleteSetup = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('complete-setup', {
        body: { type: intent, familyName: intent === 'family' ? familyName : null }
      })
      if (error) throw error
      
      setCreatedHousehold(data.household)
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#0ea5e9', '#6366f1'] })

      if (intent === 'family') {
        setLoading(false)
        setStep(3)
      } else {
        // Se for Solo, já finaliza tudo
        await finalizeAndGoToDashboard()
      }
    } catch (err) {
      alert('Erro ao configurar conta.')
      setLoading(false)
    }
  }

  const handleAddInvite = async (e) => {
    e.preventDefault()
    if (!createdHousehold) return
    setInviteLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-invite', {
        body: { household_id: createdHousehold.id, email: newInvite.email, firstName: newInvite.firstName, lastName: newInvite.lastName }
      })
      if (error) throw error
      setInvitesList([{ id: Date.now(), token: data.token, ...newInvite }, ...invitesList])
      setNewInvite({ firstName: '', lastName: '', email: '' })
    } catch (err) { alert('Erro ao criar convite.') } 
    finally { setInviteLoading(false) }
  }

  const handleShareItem = async (item) => {
    const link = `https://finansmart.app/invite?token=${item.token}`
    if (navigator.share) navigator.share({ title: 'Convite', text: `Olá ${item.firstName}, entre no FinanSmart!`, url: link })
    else { navigator.clipboard.writeText(link); alert('Copiado!') }
  }


  // --- RENDER ---
  if (flowType === 'loading') return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" /></div>

  // VIEW GUEST
  if (flowType === 'guest') {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-300/20 rounded-full blur-[100px]" />
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg w-full bg-white/80 backdrop-blur-xl border border-white p-8 rounded-3xl shadow-2xl text-center space-y-6 relative z-10">
          <div className="w-20 h-20 bg-indigo-100 rounded-full mx-auto flex items-center justify-center text-indigo-600 mb-4 shadow-sm"><Smile size={40} strokeWidth={2.5} /></div>
          <h1 className="text-3xl font-bold text-slate-900">Bem-vindo(a) à família!</h1>
          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100"><p className="text-sm text-indigo-600 uppercase font-bold tracking-wide mb-1">Você agora faz parte da</p><p className="text-2xl font-bold text-indigo-900">{guestData?.householdName}</p></div>
          <button onClick={handleFinishGuest} disabled={loading} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg">{loading ? <Loader2 className="animate-spin" /> : <>Ir para o Dashboard <ArrowRight /></>}</button>
        </motion.div>
      </div>
    )
  }

  // VIEW ADMIN
  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sky-400 to-indigo-500" />
      <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-sky-200/20 rounded-full blur-[120px]" />
      <div className="absolute -bottom-[20%] -left-[10%] w-[600px] h-[600px] bg-indigo-200/20 rounded-full blur-[120px]" />

      <div className="p-6 flex justify-between items-center z-20">
        <img src={logo} className="w-10 h-auto opacity-80" alt="FinanSmart" />
        {step < 3 && (<div className="flex gap-2">{[0, 1, 2].map(i => (<div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i <= step ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-200'}`} />))}</div>)}
      </div>

      <div className="flex-1 flex items-center justify-center p-6 z-10">
        <div className={`w-full transition-all duration-500 ${step === 3 ? 'max-w-4xl' : 'max-w-2xl'}`}>
          <AnimatePresence mode="wait">
            
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="text-center space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm mb-4"><Sparkles className="w-4 h-4 text-yellow-500" /><span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Setup Inicial</span></div>
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-600">{profile?.full_name?.split(' ')[0] || 'Usuário'}</span>.</h1>
                <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">O FinanSmart não é apenas uma planilha bonita. É um sistema inteligente que audita, alerta e planeja seu futuro financeiro.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left mt-8">{[{ icon: Zap, title: "Automação", desc: "Agentes de IA monitoram seus gastos 24/7." }, { icon: ShieldCheck, title: "Auditoria", desc: "Detectamos cobranças duplicadas." }, { icon: Sparkles, title: "Planejamento", desc: "Metas reais para alcançar sua liberdade." }].map((item, idx) => (<div key={idx} className="bg-white/60 border border-white p-4 rounded-xl shadow-sm"><item.icon className="w-6 h-6 text-indigo-500 mb-2" /><h3 className="font-bold text-slate-900 text-sm">{item.title}</h3><p className="text-xs text-slate-500 mt-1">{item.desc}</p></div>))}</div>
                <button onClick={() => setStep(1)} className="mt-8 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto">Vamos Começar <ChevronRight /></button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-8 text-center">
                <h2 className="text-3xl font-bold text-slate-900">Qual seu objetivo principal?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  <div onClick={() => setIntent('solo')} className={`cursor-pointer relative overflow-hidden p-8 rounded-2xl border-2 transition-all duration-300 group text-left ${intent === 'solo' ? 'border-sky-500 bg-sky-50 ring-4 ring-sky-500/20' : 'border-slate-200 bg-white hover:border-sky-200'}`}><div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${intent === 'solo' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-sky-100 group-hover:text-sky-500'}`}><User size={24} /></div><h3 className="text-xl font-bold text-slate-900">Uso Pessoal</h3><p className="text-sm text-slate-500 mt-2">Eu controlo minhas próprias finanças.</p>{intent === 'solo' && <div className="absolute top-4 right-4 text-sky-500"><CheckCircle /></div>}</div>
                  <div onClick={() => setIntent('family')} className={`cursor-pointer relative overflow-hidden p-8 rounded-2xl border-2 transition-all duration-300 group text-left ${intent === 'family' ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-500/20' : 'border-slate-200 bg-white hover:border-indigo-200'}`}><div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${intent === 'family' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-500'}`}><Users size={24} /></div><h3 className="text-xl font-bold text-slate-900">Gestão Familiar</h3><p className="text-sm text-slate-500 mt-2">Para casais ou famílias.</p>{intent === 'family' && <div className="absolute top-4 right-4 text-indigo-500"><CheckCircle /></div>}</div>
                </div>
                <div className="flex justify-between pt-8"><button onClick={() => setStep(0)} className="text-slate-400 hover:text-slate-600 font-medium">Voltar</button><button onClick={() => { if(intent === 'solo') handleCompleteSetup(); if(intent === 'family') setStep(2); }} disabled={!intent || loading} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center gap-2">{loading ? <Loader2 className="animate-spin" /> : (intent === 'family' ? 'Próximo' : 'Finalizar')} {!loading && <ArrowRight size={18} />}</button></div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6 text-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl mx-auto flex items-center justify-center text-indigo-600 mb-4"><Building2 size={32} /></div>
                <h2 className="text-3xl font-bold text-slate-900">Nome da sua Família</h2>
                <input type="text" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="Ex: Família Silva" className="w-full bg-white border-2 border-slate-200 rounded-xl py-4 px-6 text-xl text-center text-slate-900 font-bold placeholder:text-slate-300 focus:border-indigo-500 focus:ring-0 outline-none transition-all" autoFocus />
                <div className="flex justify-between pt-8 items-center"><button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-600 font-medium">Voltar</button><button onClick={handleCompleteSetup} disabled={!familyName.trim() || loading} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/30">{loading ? <Loader2 className="animate-spin" /> : 'Criar Família'} {!loading && <Check size={18} />}</button></div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full bg-white/90 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-2xl">
                <div className="text-center mb-8"><div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center text-green-600 mb-4"><Check size={32} strokeWidth={4} /></div><h2 className="text-2xl font-bold text-slate-900">Família Criada!</h2><p className="text-slate-500">Convide os membros agora.</p></div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><User size={16} /> Novo Membro</h3>
                      <form onSubmit={handleAddInvite} className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <input required value={newInvite.firstName} onChange={e => setNewInvite({...newInvite, firstName: e.target.value})} placeholder="Nome" className="bg-white border border-slate-200 rounded-lg p-2 text-sm w-full" />
                          <input required value={newInvite.lastName} onChange={e => setNewInvite({...newInvite, lastName: e.target.value})} placeholder="Sobrenome" className="bg-white border border-slate-200 rounded-lg p-2 text-sm w-full" />
                        </div>
                        <input type="email" required value={newInvite.email} onChange={e => setNewInvite({...newInvite, email: e.target.value})} placeholder="E-mail" className="bg-white border border-slate-200 rounded-lg p-2 text-sm w-full" />
                        <button type="submit" disabled={inviteLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-70">{inviteLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <><Plus size={16} /> Gerar Convite</>}</button>
                      </form>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[300px]">
                    <div className="p-3 border-b border-slate-200 bg-slate-100/50"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Convites ({invitesList.length})</h3></div>
                    <div className="overflow-y-auto p-2 space-y-2 flex-1">
                      {invitesList.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8 opacity-50"><Share2 size={32} className="mb-2" /><p className="text-xs text-center">Nenhum convite criado.</p></div> : invitesList.map((item) => (
                          <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2"><div className="flex justify-between items-start"><div><p className="text-sm font-bold text-slate-900">{item.firstName} {item.lastName}</p><p className="text-xs text-slate-500">{item.email}</p></div><div className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-mono font-bold">{item.token}</div></div><div className="flex gap-2 mt-1"><button onClick={() => handleShareItem(item)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1"><Share2 size={12} /> Link</button><button onClick={() => {navigator.clipboard.writeText(item.token); alert('Copiado!')}} className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"><Copy size={12} /></button></div></div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pt-6 mt-4 border-t border-slate-200/50 flex justify-end"><button onClick={finalizeAndGoToDashboard} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg">Ir para o Dashboard <ArrowRight size={18} /></button></div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function CheckCircle() { return <div className="w-6 h-6 bg-current rounded-full flex items-center justify-center"><Check size={14} className="text-white" strokeWidth={4} /></div> }