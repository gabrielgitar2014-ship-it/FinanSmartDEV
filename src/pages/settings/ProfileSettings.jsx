import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, Camera, Loader2, MapPin, Lock, Mail, Check, Search, Plus, Trash2, DollarSign, Globe 
} from 'lucide-react'
import { toast } from 'sonner'

import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { useCurrencies } from '../../hooks/useCurrencies'
import AddCurrencyModal from '../../components/AddCurrencyModal'

export default function ProfileSettings() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const { changeLanguage } = useLanguage()
  
  // Estados de Interface
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false)
  
  const fileInputRef = useRef(null)

  // Estado do Formulário
  // Note que usamos 'currencies' (plural) para o estado local
  const [formData, setFormData] = useState({
    full_name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    currencies: ['BRL'], 
    language: 'pt-BR'
  })

  // Hook de Cotações (busca taxas para as moedas selecionadas)
  const { rates, availableCurrencies } = useCurrencies(formData.currencies)

  // Carregar dados iniciais do perfil
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        zip_code: profile.zip_code || '',
        // Mapeia a coluna 'currency' do banco para 'currencies' do estado local
        currencies: Array.isArray(profile.currency) ? profile.currency : ['BRL'],
        language: profile.language || 'pt-BR'
      })
    }
  }, [profile])

  // --- HELPER: DADOS DA MOEDA ---
  const getCurrencyData = (code) => {
    return availableCurrencies.find(c => c.code === code) || { code, symbol: '?', name: code }
  }

  // --- AÇÕES DE MOEDA ---
  const handleAddCurrency = (code) => {
    if (!formData.currencies.includes(code)) {
      setFormData(prev => ({ ...prev, currencies: [...prev.currencies, code] }))
      toast.success(`${code} adicionado à carteira!`)
    }
  }

  const handleRemoveCurrency = (code) => {
    if (code === 'BRL') return // Proteção para moeda base
    setFormData(prev => ({ ...prev, currencies: prev.currencies.filter(c => c !== code) }))
  }

  // --- AÇÕES DE CEP ---
  const handleCepChange = async (e) => {
    const val = e.target.value.replace(/\D/g, '')
    setFormData(prev => ({ ...prev, zip_code: val }))

    if (val.length === 8) {
      setCepLoading(true)
      try {
        const response = await fetch(`https://viacep.com.br/ws/${val}/json/`)
        const data = await response.json()
        
        if (data.erro) {
          toast.error('CEP não encontrado.')
        } else {
          setFormData(prev => ({
            ...prev,
            address: `${data.logradouro}, ${data.bairro}`,
            city: data.localidade,
            state: data.uf
          }))
          toast.success('Endereço preenchido!')
        }
      } catch (error) {
        toast.error('Erro ao buscar CEP.')
      } finally {
        setCepLoading(false)
      }
    }
  }

  // --- UPLOAD DE AVATAR ---
  const handleAvatarUpload = async (event) => {
    try {
      setUploading(true)
      if (!event.target.files || event.target.files.length === 0) throw new Error('Selecione uma imagem.')

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)

      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      if (updateError) throw updateError

      await refreshProfile()
      toast.success('Foto atualizada!')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao enviar foto.')
    } finally {
      setUploading(false)
    }
  }

  // --- SALVAR PERFIL ---
  const handleSave = async () => {
    setLoading(true)
    try {
      // Construímos o objeto exato para enviar ao Supabase
      // AQUI ESTÁ A CORREÇÃO: 'currency' recebe 'formData.currencies'
      const profileUpdates = {
        full_name: formData.full_name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        language: formData.language,
        currency: formData.currencies // <--- Mapeamento correto para a coluna do banco
      }

      const { error } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id)

      if (error) throw error
      
      await refreshProfile()
      changeLanguage(formData.language) // Atualiza idioma globalmente
      
      toast.success('Perfil salvo com sucesso!')
      navigate(-1)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao salvar dados.')
    } finally {
      setLoading(false)
    }
  }

  // --- REDEFINIR SENHA ---
  const handlePasswordReset = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin + '/update-password' })
      if (error) throw error
      toast.success('E-mail de redefinição enviado!')
    } catch (error) { toast.error('Erro ao solicitar.') }
  }

  return (
    <div className="pb-32 lg:pb-0 bg-slate-50 dark:bg-slate-950 min-h-screen relative animate-in slide-in-from-right-10 duration-300">
      
      {/* CAPA DE FUNDO */}
      <div className="h-48 bg-gradient-to-r from-indigo-600 to-violet-600 w-full absolute top-0 left-0 z-0"></div>

      {/* HEADER */}
      <div className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white hover:bg-white/20 rounded-full transition-colors">
            <ChevronLeft size={28} />
        </button>
        <h1 className="text-lg font-bold text-white">Editar Perfil</h1>
        <button onClick={handleSave} disabled={loading} className="bg-white text-indigo-600 px-4 py-1.5 rounded-full font-bold text-xs shadow-lg disabled:opacity-50 hover:scale-105 transition-transform">
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Salvar'}
        </button>
      </div>

      {/* CONTEÚDO */}
      <div className="relative z-10 px-4 -mt-4 pb-10 space-y-6">
        
        {/* CARD PRINCIPAL (FOTO E NOME) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl flex flex-col items-center text-center border border-slate-100 dark:border-slate-800">
            <div className="relative group cursor-pointer -mt-16 mb-4" onClick={() => fileInputRef.current.click()}>
                <div className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-900 shadow-lg overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                    {uploading ? (
                        <Loader2 className="animate-spin text-indigo-600" size={40} />
                    ) : profile?.avatar_url ? (
                        <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                    ) : (
                        <span className="text-5xl font-bold text-slate-400">{profile?.full_name?.charAt(0)}</span>
                    )}
                </div>
                <div className="absolute bottom-1 right-1 bg-indigo-600 text-white p-2.5 rounded-full shadow-md border-4 border-white dark:border-slate-900 group-hover:scale-110 transition-transform">
                    <Camera size={18} />
                </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
            
            <div className="w-full space-y-4">
                <div className="relative group">
                  <label className="text-[10px] font-bold text-slate-400 uppercase absolute left-1/2 -translate-x-1/2 -top-2 bg-white dark:bg-slate-900 px-2">Nome Completo</label>
                  <input 
                      value={formData.full_name} 
                      onChange={e => setFormData({...formData, full_name: e.target.value})}
                      className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 py-2 text-xl font-bold text-slate-900 dark:text-white text-center outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-300"
                      placeholder="Seu Nome"
                  />
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500 bg-slate-50 dark:bg-slate-950/50 py-2 rounded-full">
                    <Mail size={14} /> {profile?.email}
                </div>
            </div>
        </div>

        {/* CARTEIRA GLOBAL (MOEDAS) */}
        <section className="space-y-3">
            <div className="flex justify-between items-center px-1">
               <h3 className="text-xs font-bold text-slate-400 uppercase ml-1 flex items-center gap-2"><DollarSign size={14}/> Carteira Global</h3>
               <button 
                  onClick={() => setIsCurrencyModalOpen(true)}
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
               >
                  <Plus size={14} /> Adicionar
               </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {formData.currencies.map(code => {
                    const currency = getCurrencyData(code)
                    const rate = rates[code] // Cotação atual

                    return (
                        <div key={code} className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 relative group shadow-sm">
                            {/* Botão Remover (Exceto BRL) */}
                            {code !== 'BRL' && (
                                <button 
                                  onClick={() => handleRemoveCurrency(code)}
                                  className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                            )}
                            
                            <div className="flex items-center gap-2 mb-2">
                                <div className="text-xl">{currency.flag || currency.symbol}</div>
                                <div className="overflow-hidden">
                                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{code}</p>
                                    <p className="text-[9px] text-slate-500 uppercase tracking-wide truncate">{currency.name}</p>
                                </div>
                            </div>
                            
                            {code === 'BRL' ? (
                                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg py-1 px-2 mt-1 text-center">
                                    <p className="text-[10px] font-bold text-slate-500">Moeda Base</p>
                                </div>
                            ) : (
                                <div className="mt-1">
                                    <p className="text-[9px] text-slate-400 uppercase font-bold">Cotação</p>
                                    <p className="text-xs font-mono font-bold text-emerald-600 truncate">
                                        R$ {rate ? rate.toFixed(2) : '...'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )
                })}
                
                {/* Card Adicionar Rápido */}
                <button 
                   onClick={() => setIsCurrencyModalOpen(true)}
                   className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-900 transition-all"
                >
                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-1">
                        <Plus size={16} />
                    </div>
                    <span className="text-[10px] font-bold uppercase">Nova</span>
                </button>
            </div>
        </section>

        {/* LOCALIZAÇÃO (CEP) */}
        <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 flex items-center gap-2"><MapPin size={14}/> Localização</h3>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-sm">
                <div className="flex gap-3">
                    <div className="w-full relative">
                         <label className="text-[10px] font-bold text-slate-400 uppercase">CEP</label>
                         <div className="relative">
                             <input 
                                value={formData.zip_code} 
                                onChange={handleCepChange}
                                maxLength={8}
                                placeholder="00000000"
                                className="w-full mt-1 bg-slate-50 dark:bg-slate-950 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                            />
                            {cepLoading && <div className="absolute right-3 top-3"><Loader2 className="animate-spin text-indigo-500" size={16}/></div>}
                         </div>
                    </div>
                    <div className="w-20">
                         <label className="text-[10px] font-bold text-slate-400 uppercase">UF</label>
                         <input 
                            value={formData.state} 
                            readOnly 
                            className="w-full mt-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-2.5 text-sm outline-none text-slate-500 text-center font-bold"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Endereço</label>
                    <input 
                        value={formData.address} 
                        onChange={e => setFormData({...formData, address: e.target.value})}
                        placeholder="Rua, Bairro..."
                        className="w-full mt-1 bg-slate-50 dark:bg-slate-950 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                 
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Cidade</label>
                    <input 
                        value={formData.city} 
                        onChange={e => setFormData({...formData, city: e.target.value})}
                        className="w-full mt-1 bg-slate-50 dark:bg-slate-950 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>
        </section>

        {/* IDIOMA */}
        <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 flex items-center gap-2"><Globe size={14}/> Idioma</h3>
            <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl flex">
                {['pt-BR', 'en-US'].map(lang => (
                    <button
                        key={lang}
                        onClick={() => setFormData({...formData, language: lang})}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                            formData.language === lang 
                            ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-md' 
                            : 'text-slate-500'
                        }`}
                    >
                        {lang === 'pt-BR' ? '🇧🇷 Português' : '🇺🇸 English'}
                    </button>
                ))}
            </div>
        </section>

        {/* SEGURANÇA */}
        <section className="pt-4">
            <button onClick={handlePasswordReset} className="w-full py-3 text-slate-500 hover:text-indigo-600 text-sm font-medium flex items-center justify-center gap-2 transition-colors bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-transparent hover:border-indigo-200">
                <Lock size={16} /> Redefinir minha senha
            </button>
        </section>

      </div>

      {/* MODAL DE MOEDAS */}
      <AnimatePresence>
          {isCurrencyModalOpen && (
            <AddCurrencyModal 
               isOpen={isCurrencyModalOpen} 
               onClose={() => setIsCurrencyModalOpen(false)}
               onSelect={handleAddCurrency}
               selectedCurrencies={formData.currencies}
            />
          )}
      </AnimatePresence>
    </div>
  )
}