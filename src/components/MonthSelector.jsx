import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useDateStore } from '../store/useDateStore'

export default function MonthSelector() {
  const { currentDate, nextMonth, prevMonth } = useDateStore()

  // Formatação: "Janeiro" (Capitalizado)
  const monthName = format(currentDate, 'MMMM', { locale: ptBR })
  const displayDate = monthName.charAt(0).toUpperCase() + monthName.slice(1)
  const displayYear = format(currentDate, 'yyyy')

  return (
    <div className="flex items-center justify-center gap-2 py-0">
      <button 
        onClick={prevMonth} 
        className="p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all active:scale-95"
      >
        <ChevronLeft size={25} />
      </button>

      <div className="flex flex-col items-center cursor-pointer group">
        <div className="flex items-center gap-0">
          <span className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
            {displayDate}
          </span>
          {/* Seta para baixo sutil indicando que pode ser um menu futuro */}
          <ChevronRight size={1} className="rotate-90 text-slate-300 group-hover:text-indigo-400 transition-colors" />
        </div>
        <span className="text-[8px] font-medium text-slate-400 tracking-widest">
          {displayYear}
        </span>
      </div>

      <button 
        onClick={nextMonth} 
        className="p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all active:scale-95"
      >
        <ChevronRight size={25} />
      </button>
    </div>
  )

}

