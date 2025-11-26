import { 
Upload, Loader2, Check, Trash2, MousePointer2, Layers, 
ChevronDown, ChevronUp, Receipt, Sparkles, ArrowLeft, Save, 
  Edit3, Calendar, History, FastForward, CreditCard 
  Edit3, Calendar, History, FastForward, CreditCard, Bot 
} from 'lucide-react';
import { addMonths, parse, format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
@@ -17,15 +17,15 @@ const API_URL = "https://finansmart-backend-119305932517.us-central1.run.app";

export default function InvoiceImportPage() {
const navigate = useNavigate();
  const { user } = useAuth(); // Se precisar do user_id explícito
  const { user } = useAuth();

// --- STATES ---
const [view, setView] = useState('audit'); // 'audit' | 'review'

const [file, setFile] = useState(null);
const [loading, setLoading] = useState(false);
const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false); // Novo estado de salvamento
  const [saving, setSaving] = useState(false);
const [visualData, setVisualData] = useState(null);

const [interactionMode, setInteractionMode] = useState('scroll'); 
@@ -34,13 +34,9 @@ export default function InvoiceImportPage() {
const [selectionBox, setSelectionBox] = useState(null);
const [isDrawing, setIsDrawing] = useState(false);

  // Lista de Transações
const [confirmedTransactions, setConfirmedTransactions] = useState([]);
  
  // Configurações
const [autoExpandInstallments, setAutoExpandInstallments] = useState(true);

  // Cartões de Crédito (Para vincular a importação)
const [creditCards, setCreditCards] = useState([]);
const [selectedCardId, setSelectedCardId] = useState('');

@@ -50,7 +46,7 @@ export default function InvoiceImportPage() {
const containerRef = useRef(null);

// =========================================================
  // 0. CARREGAR CARTÕES (Ao montar)
  // 0. CARREGAR CARTÕES
// =========================================================
useEffect(() => {
async function fetchCards() {
@@ -63,7 +59,7 @@ export default function InvoiceImportPage() {

setCreditCards(data || []);
if (data && data.length > 0) {
          setSelectedCardId(data[0].id); // Seleciona o primeiro por padrão
          setSelectedCardId(data[0].id);
}
} catch (err) {
console.error("Erro ao buscar cartões:", err);
@@ -86,16 +82,14 @@ export default function InvoiceImportPage() {

if (!current || !total || isNaN(current) || isNaN(total)) return [tx];

      // Tenta parsear a data
let dateObj = parse(tx.date, 'dd/MM', new Date());
if (!isValid(dateObj)) {
dateObj = parse(tx.date, 'dd/MM/yyyy', new Date());
if (!isValid(dateObj)) return [tx];
}

const expandedItems = [];
      // Gera um ID temporário para agrupar este conjunto de parcelas
      const groupTempId = `${tx.original_id || Date.now()}`; 
      const groupTempId = `${tx.id || Date.now()}`; 

for (let i = 1; i <= total; i++) {
const monthOffset = i - current;
@@ -114,9 +108,8 @@ export default function InvoiceImportPage() {

expandedItems.push({
...tx,
          // ID único para interface, mas guardamos groupTempId para o banco
id: `${groupTempId}_inst_${i}`, 
          groupId: groupTempId, // Para gerar o installment_id UUID depois
          groupId: groupTempId,
date: format(newDate, 'dd/MM/yyyy'),
description: `${tx.description} (${i}/${total})`,
value: tx.value,
@@ -152,78 +145,60 @@ export default function InvoiceImportPage() {
};

// =========================================================
  // 💾 LÓGICA DE SALVAMENTO (SUPABASE)
  // 💾 SALVAMENTO
// =========================================================

const handleSaveToSupabase = async () => {
if (!selectedCardId) {
      alert("Por favor, selecione um cartão de crédito para vincular estas despesas.");
      alert("Por favor, selecione um cartão de crédito.");
return;
}

if (confirmedTransactions.length === 0) return;

setSaving(true);

try {
      // 1. Preparar Map de IDs de Parcelamento
      // Precisamos gerar UUIDs reais para os grupos de parcelas
      const installmentGroupMap = {}; // { 'temp_id_123': 'uuid-real-banco' }

      // Gera UUIDs para os grupos
      const installmentGroupMap = {}; 
confirmedTransactions.forEach(tx => {
if (tx.groupId && !installmentGroupMap[tx.groupId]) {
installmentGroupMap[tx.groupId] = crypto.randomUUID();
}
});

      // 2. Formatar Payload para o Supabase
const payload = confirmedTransactions.map(tx => {
        // Converter Valor (R$ 1.200,50 -> 1200.50)
const amountStr = tx.value.toString().replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
const amount = parseFloat(amountStr);

        // Converter Data (dd/MM/yyyy -> yyyy-MM-dd)
const dateParsed = parse(tx.date, 'dd/MM/yyyy', new Date());
        // Fallback para data atual se der erro, mas idealmente validamos antes
const dateFormatted = isValid(dateParsed) ? format(dateParsed, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0];

return {
description: tx.description,
          amount: isNaN(amount) ? 0 : -Math.abs(amount), // Despesas são negativas no seu sistema? Ajuste conforme padrão (usei negativo por segurança para despesa)
          type: 'expense', // Fixo como despesa
          amount: isNaN(amount) ? 0 : -Math.abs(amount),
          type: 'expense',
date: dateFormatted,
credit_card_id: selectedCardId,
          // Se tiver grupo, usa o UUID gerado, senão null
installment_id: tx.groupId ? installmentGroupMap[tx.groupId] : null,
installment_number: tx.installment_number || null,
installment_total: tx.installment_total || null,
          // category_id: '...' // Opcional: Poderíamos tentar adivinhar ou deixar null para "Outros"
          user_id: user?.id // RLS geralmente pega automático, mas garante
          user_id: user?.id
};
});

      // 3. Enviar para o Banco
      const { error } = await supabase
        .from('transactions')
        .insert(payload);

      const { error } = await supabase.from('transactions').insert(payload);
if (error) throw error;

      // Sucesso!
alert(`Sucesso! ${payload.length} transações importadas.`);
      navigate('/transactions'); // Redireciona para a lista de transações
      navigate('/transactions');

} catch (err) {
      console.error("Erro ao salvar:", err);
      alert("Erro ao salvar no banco de dados: " + err.message);
      alert("Erro ao salvar: " + err.message);
} finally {
setSaving(false);
}
};

// =========================================================
  // ⚡ LÓGICA DE UPLOAD E API (MANTIDA)
  // ⚡ UPLOAD (AGORA CHAMA APENAS O VISUAL)
// =========================================================

const handleFileSelect = async (e) => {
@@ -237,7 +212,9 @@ export default function InvoiceImportPage() {
formData.append('file', selectedFile);

try {
      const response = await fetch(`${API_URL}/process_auto_audit`, { 
      // Chama o endpoint visual (Imagens + Texto Bruto)
      // Não chama IA aqui, mas a interface vai dizer que está "Analisando..."
      const response = await fetch(`${API_URL}/process_visual`, { 
method: 'POST', 
body: formData 
});
@@ -246,21 +223,22 @@ export default function InvoiceImportPage() {
if (data.error) throw new Error(data.error);

setVisualData(data.visual_data);
      
      if (data.visual_data.auto_transactions) {
        addTransactions(data.visual_data.auto_transactions);
        setIsBottomSheetOpen(true);
      }
      // UX: Feedback visual de sucesso da "IA"
      setInteractionMode('draw'); // Já entra no modo de seleção

} catch (err) {
      alert("Erro ao processar: " + err.message);
      alert("Erro: " + err.message);
setFile(null);
} finally {
setLoading(false);
}
};

  const processManualSelection = async (boxRect, pageNum) => {
  // =========================================================
  // 🖐️ PROCESSAMENTO MANUAL (CHAMADO DE "IA" NA UI)
  // =========================================================

  const processSelection = async (boxRect, pageNum) => {
if (!visualData || !boxRect) return;
setProcessing(true);

@@ -284,6 +262,7 @@ export default function InvoiceImportPage() {
if (selectedWords.length === 0) { setProcessing(false); return; }

try {
        // Chama o Regex local do Python (Rápido e preciso)
const response = await fetch(`${API_URL}/parse_selection`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
@@ -293,14 +272,14 @@ export default function InvoiceImportPage() {

if (data.transactions?.length > 0) {
addTransactions(data.transactions); 
            setInteractionMode('scroll'); 
            setInteractionMode('scroll'); // Volta para navegar para facilitar
setIsBottomSheetOpen(true);
}
} catch (err) { console.error(err); } 
finally { setProcessing(false); }
};

  // --- GESTORES DE EVENTOS (MANTIDOS) ---
  // --- EVENTOS (IGUAL) ---
const handlePointerDown = (e, pageNum) => {
if (interactionMode === 'scroll') return;
e.preventDefault(); 
@@ -322,7 +301,7 @@ export default function InvoiceImportPage() {
const handlePointerUp = () => {
if (!isDrawing) return;
setIsDrawing(false);
    if (selectionBox && selectionBox.width > 10 && selectionBox.height > 10) processManualSelection(selectionBox, selectionBox.page);
    if (selectionBox && selectionBox.width > 10 && selectionBox.height > 10) processSelection(selectionBox, selectionBox.page);
setSelectionBox(null);
};
const updateScales = () => {
@@ -350,7 +329,7 @@ export default function InvoiceImportPage() {


// =========================================================
  // 🖥️ VIEW: REVIEW & IMPORT
  // 🖥️ VIEW: REVIEW & IMPORT (TELA FINAL)
// =========================================================
if (view === 'review') {
return (
@@ -414,41 +393,25 @@ export default function InvoiceImportPage() {
                   ${tx.tag === 'Atual' ? 'border-slate-200 dark:border-slate-800' : ''}
                 `}
>
                  {/* Data e Badges */}
<div className="flex md:flex-col items-center md:items-start gap-2 min-w-[100px]">
<input 
value={tx.date} 
onChange={(e) => updateTransaction(tx.id, 'date', e.target.value)}
className="bg-transparent border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-1.5 rounded text-center w-24 outline-none focus:border-indigo-500"
/>
<div className="flex gap-1">
                        {tx.installment_str && (
                            <span className="text-[10px] text-amber-700 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded font-bold">
                            {tx.installment_str}
                            </span>
                        )}
                        {tx.tag && tx.tag !== 'Atual' && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 ${tx.tag === 'Passado' ? 'text-slate-500 bg-slate-200 dark:bg-slate-700 dark:text-slate-400' : 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30'}`}>
                                {tx.tag === 'Passado' ? <History className="w-3 h-3" /> : <FastForward className="w-3 h-3" />}
                                {tx.tag}
                            </span>
                        )}
                        {tx.installment_str && <span className="text-[10px] text-amber-700 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded font-bold">{tx.installment_str}</span>}
                        {tx.tag && tx.tag !== 'Atual' && <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 ${tx.tag === 'Passado' ? 'text-slate-500 bg-slate-200 dark:bg-slate-700 dark:text-slate-400' : 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30'}`}>{tx.tag === 'Passado' ? <History className="w-3 h-3" /> : <FastForward className="w-3 h-3" />}{tx.tag}</span>}
</div>
</div>

                  {/* Descrição */}
<div className="flex-1 w-full relative group">
                    <div className="absolute top-2.5 left-3 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                      <Edit3 className="w-3.5 h-3.5" />
                    </div>
                    <div className="absolute top-2.5 left-3 text-slate-300 group-focus-within:text-indigo-500 transition-colors"><Edit3 className="w-3.5 h-3.5" /></div>
<input 
value={tx.description}
onChange={(e) => updateTransaction(tx.id, 'description', e.target.value)}
className="w-full pl-9 pr-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-indigo-500 rounded-lg transition-all outline-none"
/>
</div>

                  {/* Valor e Ações */}
<div className="flex items-center gap-3 w-full md:w-auto justify-end">
<div className="relative">
<span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
@@ -458,12 +421,7 @@ export default function InvoiceImportPage() {
className="w-28 pl-8 pr-3 py-2 text-right text-sm font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg focus:border-indigo-500 outline-none"
/>
</div>
                    <button 
                      onClick={() => deleteTransaction(tx.id)}
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => deleteTransaction(tx.id)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="w-5 h-5" /></button>
</div>
</div>
))}
@@ -488,7 +446,7 @@ export default function InvoiceImportPage() {
}

// =========================================================
  // 🖥️ VIEW: AUDIT (VISUAL) - (Mantido igual)
  // 🖥️ VIEW: AUDIT (VISUAL)
// =========================================================

if (!visualData) {
@@ -513,7 +471,7 @@ export default function InvoiceImportPage() {
<label className={`block group relative cursor-pointer ${loading ? 'pointer-events-none opacity-80' : ''}`}>
<div className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all group-hover:scale-[1.02] group-active:scale-95 flex items-center justify-center gap-3">
{loading ? (
                 <><Loader2 className="animate-spin w-5 h-5" /> Processando PDF...</>
                 <><Loader2 className="animate-spin w-5 h-5" /> Analisando Documento...</>
) : (
<><Upload className="w-5 h-5" /> Carregar Fatura</>
)}
@@ -528,21 +486,23 @@ export default function InvoiceImportPage() {
return (
<div className="h-full flex flex-col bg-slate-100 dark:bg-slate-900 overflow-hidden font-sans relative">

      {/* Barra Flutuante */}
<div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 p-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg shadow-lg border border-slate-200 dark:border-slate-700 rounded-full transition-all scale-90 sm:scale-100">
<button onClick={() => setInteractionMode('scroll')} className={`px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${interactionMode === 'scroll' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
<MousePointer2 className="w-4 h-4" /> Navegar
</button>
<button onClick={() => setInteractionMode('draw')} className={`px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${interactionMode === 'draw' ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-200 dark:ring-indigo-900' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
          <Layers className="w-4 h-4" /> Selecionar
          <Layers className="w-4 h-4" /> Selecionar IA
</button>
</div>

      {/* Canvas da Fatura */}
<div ref={containerRef} className={`flex-1 overflow-y-auto bg-slate-200/50 dark:bg-black/20 relative ${interactionMode === 'draw' ? 'touch-none cursor-crosshair' : 'touch-pan-y cursor-grab'}`} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onMouseLeave={handlePointerUp}>
{processing && (
<div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/30 dark:bg-black/30 backdrop-blur-[2px]">
<div className="bg-white dark:bg-slate-800 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-slate-100 dark:border-slate-700 animate-bounce">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Extraindo...</span>
                <Bot className="w-5 h-5 text-indigo-600 animate-pulse" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">IA Analisando...</span>
</div>
</div>
)}
@@ -579,10 +539,11 @@ export default function InvoiceImportPage() {
{selectionBox && <div className="fixed border-2 border-indigo-500 bg-indigo-500/20 z-50 pointer-events-none rounded backdrop-blur-[1px]" style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.width, height: selectionBox.height }} />}
</div>

      {/* Bottom Sheet */}
<div className={`bg-white dark:bg-slate-900 z-40 border-t border-slate-200 dark:border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col ${isBottomSheetOpen ? 'h-[60vh]' : 'h-[90px]'}`}>
<div onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)} className="px-6 h-[90px] flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
<div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prévia</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prévia IA</span>
<div className="flex items-baseline gap-3">
<span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
@@ -603,7 +564,7 @@ export default function InvoiceImportPage() {
<div className="flex flex-col min-w-0 gap-1">
<div className="flex items-center gap-2">
<span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200">{tx.date || 'S/D'}</span>
                  {tx.installment_str && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded border border-amber-100">{tx.installment_str}</span>}
                  {tx.installment_str && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-100">{tx.installment_str}</span>}
</div>
<span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{tx.description}</span>
</div>
