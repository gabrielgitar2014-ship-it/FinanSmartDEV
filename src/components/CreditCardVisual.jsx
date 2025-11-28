import { Wifi } from 'lucide-react'

export default function CreditCardVisual({ 
  skin, 
  last4, 
  name, 
  isSelected, 
  onClick, 
  className = "",
  label = "Crédito" // Padrão: exibe 'Crédito' se não informado
}) {
  return (
    <div 
      onClick={onClick}
      className={`relative w-full aspect-[1.58/1] rounded-xl p-4 flex flex-col justify-between shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-white/10 ${
        isSelected 
          ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-100 z-10' 
          : 'scale-95 opacity-70 hover:opacity-100 hover:scale-100 grayscale-[0.3] hover:grayscale-0'
      } ${className}`}
      style={{ background: skin.bg, color: skin.textColor }}
    >
      {/* Textura Metal/Ruído (Opcional) */}
      {skin.texture === 'metal' && (
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-30 mix-blend-overlay pointer-events-none"></div>
      )}
      
      {/* Topo: Tipo do Cartão e NFC */}
      <div className="flex justify-between items-start relative z-10">
        {/* AQUI MUDOU: Texto Clean em vez de Logo */}
        <span className="font-bold text-sm uppercase tracking-[0.2em] opacity-80">
          {label}
        </span>
        
        <Wifi className="rotate-90 opacity-80" size={20} />
      </div>

      {/* Chip */}
      <div className="relative z-10 flex items-center gap-4 mt-1">
        <div className="w-10 h-8 bg-yellow-200/90 rounded-md border border-yellow-500/40 relative flex items-center justify-center shadow-sm overflow-hidden">
           <div className="absolute inset-0 border-t border-b border-yellow-600/20 h-1/2 top-1/4"></div>
           <div className="absolute inset-0 border-l border-r border-yellow-600/20 w-1/2 left-1/4"></div>
        </div>
      </div>

      {/* Rodapé: Número e Nome */}
      <div className="relative z-10 mt-auto pt-2">
        <p className="font-mono text-lg sm:text-xl tracking-widest mb-3 drop-shadow-md whitespace-nowrap">
          •••• •••• •••• {last4 || '1234'}
        </p>
        
        <div className="flex justify-between items-end">
          <div className="max-w-[70%]">
            <p className="text-[7px] opacity-60 uppercase tracking-wide mb-0.5">Titular</p>
            <p className="text-xs uppercase font-bold tracking-wide truncate">{name || 'SEU NOME'}</p>
          </div>
          <div className="text-right">
             <p className="text-[7px] opacity-60 uppercase mb-0.5">Validade</p>
             <span className="text-xs font-bold">12/30</span>
          </div>
        </div>
      </div>
    </div>
  )
}