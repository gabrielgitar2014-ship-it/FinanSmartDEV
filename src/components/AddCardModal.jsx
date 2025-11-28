import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Check, Loader2, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { getSkinsForBank } from '../constants/cardSkins'
import CreditCardVisual from './CreditCardVisual'

export default function AddCardModal({ isOpen, onClose, onSave, bankSlug }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  
  // Estados
  const [selectedSkin, setSelectedSkin] = useState(null)
  const [name, setName] = useState('')
  const [last4, setLast4] = useState('')
  const [limit, setLimit] = useState('')
  const [closingDay, setClosingDay] = useState('')
  const [dueDay, setDueDay] = useState('')

  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setLoading(false)
      setSelectedSkin(null)
      const skins = getSkinsForBank(bankSlug)
      if (skins.length > 0) setSelectedSkin(skins[0])
    }
  }, [isOpen, bankSlug])

  if (!isOpen) return null

  const availableSkins = getSkinsForBank(bankSlug)

  const handleNext = () => {
    if (!selectedSkin) return toast.error('Escolha um modelo')
    setName(selectedSkin.name)
    setStep(2)
  }

  const handleSubmit = async () => {
    if (!name || !limit || !closingDay || !dueDay) return toast.error('Preencha todos os campos')
    setLoading(true)
    
    const cardData = {
      name,
      last_4_digits: last4 || null,
      limit_amount: parseFloat(limit.replace(',', '.') || 0),
      closing_day: parseInt(closingDay),
      due_day: parseInt(dueDay),
      skin_id: selectedSkin.id, 
      color: selectedSkin.bg 
    }

    const result = await onSave(cardData)
    setLoading(false)
    
    if (result.success) {
      toast.success('Cartão adicionado!')
      onClose()
    } else {
      toast.error('Erro ao criar cartão.')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center p-0 lg:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }}
        className="relative w-full max-w-md bg-slate-50 dark:bg-slate-900 rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header Compacto */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button onClick={() => setStep(1)} className="p-1 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
                <ChevronLeft size={20} className="text-slate-500" />
              </button>
            )}
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {step === 1 ? 'Estilo do Cartão' : 'Preencher Dados'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full hover:opacity-80 transition-opacity">
            <X size={18} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          
          {/* PASSO 1: ESCOLHA VISUAL (LISTA LIMPA) */}
          {step === 1 && (
            <div className="space-y-8 pb-4">
              <div className="text-center space-y-1">
                <p className="text-sm text-slate-500 dark:text-slate-400">Selecione o visual que corresponde ao seu cartão físico.</p>
              </div>

              <div className="space-y-6 px-2">
                {availableSkins.map(skin => (
                  <div key={skin.id} className="relative group">
                    {/* Label flutuante se selecionado */}
                    {selectedSkin?.id === skin.id && (
                      <motion.div 
                        layoutId="active-badge"
                        className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm"
                      >
                        SELECIONADO
                      </motion.div>
                    )}
                    
                    <CreditCardVisual 
                      skin={skin}
                      name="SEU NOME"
                      last4="••••"
                      isSelected={selectedSkin?.id === skin.id}
                      onClick={() => setSelectedSkin(skin)}
                    />
                    
                    <p className={`text-center text-xs font-bold mt-3 transition-colors ${selectedSkin?.id === skin.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {skin.name}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-4 sticky bottom-0 bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent pb-2">
                <button 
                  onClick={handleNext} 
                  className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* PASSO 2: DADOS (PREVIEW MENOR NO TOPO) */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-10">
              {/* Preview Estático */}
              <div className="transform scale-90">
                <CreditCardVisual skin={selectedSkin} name="VOCÊ" last4={last4 || '••••'} isSelected={true} />
              </div>

              <div className="space-y-4 bg-white dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <input 
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-transparent border-b border-slate-200 dark:border-slate-600 py-2 font-bold text-lg text-slate-900 dark:text-white focus:border-indigo-500 outline-none placeholder:text-slate-300"
                  placeholder="Nome (ex: Nubank Black)"
                />
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Final</label>
                    <input 
                      type="text" maxLength={4} value={last4} onChange={e => setLast4(e.target.value)}
                      className="w-full bg-transparent border-b border-slate-200 dark:border-slate-600 py-1 font-mono text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                      placeholder="1234"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Limite</label>
                    <input 
                      type="number" value={limit} onChange={e => setLimit(e.target.value)}
                      className="w-full bg-transparent border-b border-slate-200 dark:border-slate-600 py-1 font-bold text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="text-[10px] font-bold text-indigo-600 uppercase block mb-1">Fechamento</label>
                    <input type="number" value={closingDay} onChange={e => setClosingDay(e.target.value)} className="w-full bg-transparent font-bold text-center outline-none" placeholder="Dia" />
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="text-[10px] font-bold text-indigo-600 uppercase block mb-1">Vencimento</label>
                    <input type="number" value={dueDay} onChange={e => setDueDay(e.target.value)} className="w-full bg-transparent font-bold text-center outline-none" placeholder="Dia" />
                  </div>
                </div>
              </div>

              <button onClick={handleSubmit} disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all">
                {loading ? <Loader2 className="animate-spin" /> : <>Salvar Cartão <Check size={20} /></>}
              </button>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  )
}