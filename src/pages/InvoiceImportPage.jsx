import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Loader2, Check, Trash2, MousePointer2, Layers, 
  ChevronDown, ChevronUp, Receipt, Sparkles, ArrowLeft, Save, 
  Edit3, Calendar, History, FastForward, CreditCard 
} from 'lucide-react';
import { addMonths, parse, format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

// Integração com o Supabase
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

// URL do Backend Cloud Run
const API_URL = "https://finansmart-backend-119305932517.us-central1.run.app";

export default function InvoiceImportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // --- STATES ---
  const [view, setView] = useState('audit'); // 'audit' | 'review'
  
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visualData, setVisualData] = useState(null);
  
  const [interactionMode, setInteractionMode] = useState('scroll'); 
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  
  const [selectionBox, setSelectionBox] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Lista de Transações (Visualização Simplificada)
  const [confirmedTransactions, setConfirmedTransactions] = useState([]);
  
  // Configurações
  const [autoExpandInstallments, setAutoExpandInstallments] = useState(true);
  
  // Cartões de Crédito
  const [creditCards, setCreditCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState('');

  const startPos = useRef({ x: 0, y: 0 });
  const [pageScales, setPageScales] = useState({});
  const imageRefs = useRef({});
  const containerRef = useRef(null);

  // =========================================================
  // 0. CARREGAR CARTÕES
  // =========================================================
  useEffect(() => {
    async function fetchCards() {
      try {
        const { data, error } = await supabase
          .from('credit_cards')
          .select('id, name, last_four_digits');
        
        if (error) throw error;
        
        setCreditCards(data || []);
        // Não seleciona automaticamente para forçar o usuário a escolher
      } catch (err) {
        console.error("Erro ao buscar cartões:", err);
      }
    }
    fetchCards();
  }, []);

  // =========================================================
  // 🧠 LÓGICA DE PARCELAMENTO (AGORA SILENCIOSA)
  // =========================================================

  // Esta função só é chamada na hora de SALVAR, não na visualização
  const generateInstallmentsPayload = (tx) => {
    // Se não tiver parcela ou expansão desligada, retorna o item único
    if (!tx.installment || !autoExpandInstallments) return [formatPayloadItem(tx)];

    try {
      const parts = tx.installment.split('/').map(n => parseInt(n.trim()));
      const current = parts[0];
      const total = parts[1];
      
      if (!current || !total || isNaN(current) || isNaN(total)) return [formatPayloadItem(tx)];

      let dateObj = parse(tx.date, 'dd/MM', new Date());
      if (!isValid(dateObj)) {
         dateObj = parse(tx.date, 'dd/MM/yyyy', new Date());
         // Se data inválida, usa data atual
         if (!isValid(dateObj)) dateObj = new Date();
      }

      const items = [];
      // Gera UUID temporário para agrupar no banco (se o backend não mandou)
      const groupTempId = tx.groupId || crypto.randomUUID(); 

      for (let i = 1; i <= total; i++) {
        const monthOffset = i - current;
        const newDate = addMonths(dateObj, monthOffset);
        
        items.push({
          description: `${tx.description} (${i}/${total})`,
          amount: parseAmount(tx.value),
          type: 'expense',
          date: format(newDate, 'yyyy-MM-dd'),
          credit_card_id: selectedCardId,
          installment_id: groupTempId, // Será substituído por UUID real no save
          installment_number: i,
          installment_total: total,
          user_id: user?.id
        });
      }

      return items;

    } catch (e) {
      console.error("Erro ao expandir:", e);
      return [formatPayloadItem(tx)];
    }
  };

  const parseAmount = (val) => {
    const str = val.toString().replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
    const num = parseFloat(str);
    return isNaN(num) ? 0 : -Math.abs(num); // Sempre negativo para despesa
  };

  const formatPayloadItem = (tx) => {
    let dateObj = parse(tx.date, 'dd/MM', new Date());
    if (!isValid(dateObj)) dateObj = parse(tx.date, 'dd/MM/yyyy', new Date());
    const dateStr = isValid(dateObj) ? format(dateObj, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0];

    return {
      description: tx.description,
      amount: parseAmount(tx.value),
      type: 'expense',
      date: dateStr,
      credit_card_id: selectedCardId,
      user_id: user?.id
    };
  };

  // Adiciona itens à lista visual (sem expandir ainda)
  const addTransactions = (newItems) => {
    setConfirmedTransactions(prev => [...prev, ...newItems]);
  };

  // =========================================================
  // 💾 SALVAMENTO
  // =========================================================

  const handleSaveToSupabase = async () => {
    if (!selectedCardId) {
      alert("ERRO: Selecione um cartão de crédito antes de salvar.");
      return;
    }
    if (confirmedTransactions.length === 0) return;

    setSaving(true);

    try {
      // 1. Gera UUIDs reais para os grupos de parcelas
      const installmentGroupMap = {}; 
      confirmedTransactions.forEach(tx => {
        if (tx.groupId || tx.installment) { // Se tem parcela, precisa de ID de grupo
           const key = tx.groupId || tx.id; // Usa ID como chave se não tiver groupId
           if (!installmentGroupMap[key]) {
             installmentGroupMap[key] = crypto.randomUUID();
           }
        }
      });

      // 2. Gera o payload expandido (aqui acontece a mágica silenciosa)
      let fullPayload = [];
      
      for (const tx of confirmedTransactions) {
        const items = generateInstallmentsPayload(tx);
        
        // Atualiza o installment_id com o UUID real gerado acima
        const finalItems = items.map(item => {
            // Se o item foi gerado de uma expansão, ele terá installment_id temporário
            if (item.installment_id) {
                // Tenta recuperar o UUID real mapeado
                const originalKey = tx.groupId || tx.id;
                if (installmentGroupMap[originalKey]) {
                    item.installment_id = installmentGroupMap[originalKey];
                }
            }
            return item;
        });
        
        fullPayload = [...fullPayload, ...finalItems];
      }

      // 3. Envia
      const { error } = await supabase.from('transactions').insert(fullPayload);
      if (error) throw error;

      alert(`Sucesso! ${fullPayload.length} lançamentos criados (incluindo parcelas futuras/passadas).`);
      navigate('/transactions');

    } catch (err) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // ⚡ UPLOAD
  // =========================================================

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    if (!selectedCardId) {
        alert("Por favor, selecione o cartão de crédito ANTES de carregar a fatura.");
        e.target.value = null; // Limpa o input
        return;
    }

    setFile(selectedFile);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${API_URL}/process_visual`, { 
        method: 'POST', 
        body: formData 
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setVisualData(data.visual_data);
      setInteractionMode('draw');

    } catch (err) {
      alert("Erro: " + err.message);
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // 🖐️ PROCESSAMENTO MANUAL
  // =========================================================

  const processSelection = async (boxRect, pageNum) => {
    if (!visualData || !boxRect) return;
    setProcessing(true);

    const pageMeta = visualData.text_map.find(p => p.page === pageNum);
    const currentScale = pageScales[pageNum];
    const imgRect = imageRefs.current[pageNum].getBoundingClientRect();

    const relativeBox = {
      x0: (boxRect.x - imgRect.left) / currentScale,
      top: (boxRect.y - imgRect.top) / currentScale,
      x1: (boxRect.x + boxRect.width - imgRect.left) / currentScale,
      bottom: (boxRect.y + boxRect.height - imgRect.top) / currentScale
    };

    const selectedWords = pageMeta.words.filter(word => {
      const wCx = word.x0 + (word.x1 - word.x0) / 2;
      const wCy = word.top + (word.bottom - word.top) / 2;
      return (wCx >= relativeBox.x0 && wCx <= relativeBox.x1 && wCy >= relativeBox.top && wCy <= relativeBox.bottom);
    });

    if (selectedWords.length === 0) { setProcessing(false); return; }

    try {
        const response = await fetch(`${API_URL}/parse_selection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ words: selectedWords })
        });
        const data = await response.json();

        if (data.transactions?.length > 0) {
            addTransactions(data.transactions); 
            setInteractionMode('scroll');
            setIsBottomSheetOpen(true);
        }
    } catch (err) { console.error(err); } 
    finally { setProcessing(false); }
  };

  // --- EVENTOS ---
  const handlePointerDown = (e, pageNum) => {
    if (interactionMode === 'scroll') return;
    e.preventDefault(); 
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setIsDrawing(true);
    startPos.current = { x: clientX, y: clientY };
    setSelectionBox({ x: clientX, y: clientY, width: 0, height: 0, page: pageNum });
  };
  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const width = clientX - startPos.current.x;
    const height = clientY - startPos.current.y;
    setSelectionBox(prev => ({ ...prev, width: Math.abs(width), height: Math.abs(height), x: width > 0 ? startPos.current.x : clientX, y: height > 0 ? startPos.current.y : clientY }));
  };
  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (selectionBox && selectionBox.width > 10 && selectionBox.height > 10) processSelection(selectionBox, selectionBox.page);
    setSelectionBox(null);
  };
  const updateScales = () => {
    if (!visualData) return;
    const newScales = {};
    visualData.images.forEach((img) => {
      const el = imageRefs.current[img.page];
      const meta = visualData.text_map.find(p => p.page === img.page);
      if (el && meta) newScales[img.page] = el.offsetWidth / meta.width;
    });
    setPageScales(newScales);
  };
  useEffect(() => { window.addEventListener('resize', updateScales); return () => window.removeEventListener('resize', updateScales); }, [visualData]);

  const updateTransaction = (id, field, value) => {
    setConfirmedTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, [field]: value } : tx));
  };
  const deleteTransaction = (id) => {
    setConfirmedTransactions(prev => prev.filter(tx => tx.id !== id));
  };
  const totalValue = confirmedTransactions.reduce((acc, cur) => { 
    const v = parseFloat(cur.value.toString().replace('R$', '').replace(/\./g, '').replace(',', '.').trim()); 
    return acc + (isNaN(v) ? 0 : v); 
  }, 0);


  // =========================================================
  // 🖥️ VIEW: REVIEW
  // =========================================================
  if (view === 'review') {
    return (
      <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 font-sans animate-in slide-in-from-right-8 duration-500">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <button onClick={() => setView('audit')} className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors gap-1 font-medium text-sm">
              <ArrowLeft className="w-4 h-4" /> Voltar à Fatura
            </button>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">Revisão</h1>
            <div className="w-16"></div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-xl flex justify-between items-center">
              <div>
                <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider">Total Selecionado</p>
                <h2 className="text-3xl font-bold mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</h2>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{confirmedTransactions.length}</p>
                <p className="text-indigo-200 text-xs">Itens</p>
              </div>
            </div>

            {confirmedTransactions.map((tx) => (
              <div key={tx.id} className="bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex md:flex-col items-center md:items-start gap-2 min-w-[100px]">
                  <input value={tx.date} onChange={(e) => updateTransaction(tx.id, 'date', e.target.value)} className="bg-transparent border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-1.5 rounded text-center w-24 outline-none focus:border-indigo-500"/>
                  {tx.installment && <span className="text-[10px] text-amber-700 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded font-bold">{tx.installment}</span>}
                </div>
                <div className="flex-1 w-full relative group">
                  <div className="absolute top-2.5 left-3 text-slate-300"><Edit3 className="w-3.5 h-3.5" /></div>
                  <input value={tx.description} onChange={(e) => updateTransaction(tx.id, 'description', e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-indigo-500 rounded-lg transition-all outline-none"/>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <div className="relative"><span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span><input value={tx.value.toString().replace('R$', '').trim()} onChange={(e) => updateTransaction(tx.id, 'value', e.target.value)} className="w-28 pl-8 pr-3 py-2 text-right text-sm font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg focus:border-indigo-500 outline-none"/></div>
                  <button onClick={() => deleteTransaction(tx.id)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 md:p-6 sticky bottom-0 z-20">
          <div className="max-w-3xl mx-auto">
            <button onClick={handleSaveToSupabase} disabled={saving || confirmedTransactions.length === 0} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? "PROCESSAR E SALVAR" : "CONFIRMAR IMPORTAÇÃO"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // 🖥️ VIEW: UPLOAD
  // =========================================================

  if (!visualData) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-sm text-center space-y-8 animate-in fade-in duration-700">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-4 shadow-inner ring-8 ring-indigo-50 dark:ring-indigo-900/10">
            <Sparkles className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Importador Inteligente</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">IA + Visão Computacional</p>
          </div>
          
          {/* SELEÇÃO DE CARTÃO (AGORA OBRIGATÓRIA AQUI) */}
          <div className="w-full text-left bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">1. Selecione o Cartão</label>
                <div className="relative">
                    <CreditCard className="absolute left-3 top-3 w-5 h-5 text-indigo-500" />
                    <select 
                        value={selectedCardId} 
                        onChange={(e) => setSelectedCardId(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                    >
                        <option value="" disabled>Escolha...</option>
                        {creditCards.map(card => (
                            <option key={card.id} value={card.id}>{card.name} (Final {card.last_four_digits})</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => setAutoExpandInstallments(!autoExpandInstallments)}>
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${autoExpandInstallments ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                {autoExpandInstallments && <Check className="w-3 h-3 text-white" />}
            </div>
            <span>Expandir parcelas automaticamente</span>
          </div>

          <label className={`block group relative cursor-pointer ${loading ? 'pointer-events-none opacity-80' : ''}`}>
            <div className={`w-full text-white font-bold py-4 rounded-2xl shadow-xl transition-all group-hover:scale-[1.02] group-active:scale-95 flex items-center justify-center gap-3 ${selectedCardId ? 'bg-slate-900 dark:bg-indigo-600 shadow-indigo-500/20' : 'bg-slate-400 cursor-not-allowed'}`}>
               {loading ? (
                 <><Loader2 className="animate-spin w-5 h-5" /> Processando PDF...</>
               ) : (
                 <><Upload className="w-5 h-5" /> 2. Carregar Fatura</>
               )}
            </div>
            <input type="file" accept="application/pdf" onChange={handleFileSelect} className="hidden" disabled={loading || !selectedCardId}/>
          </label>
        </div>
      </div>
    );
  }

  // =========================================================
  // 🖥️ VIEW: CANVAS (AUDIT)
  // =========================================================
  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-900 overflow-hidden font-sans relative">
      
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 p-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg shadow-lg border border-slate-200 dark:border-slate-700 rounded-full transition-all scale-90 sm:scale-100">
        <button onClick={() => setInteractionMode('scroll')} className={`px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${interactionMode === 'scroll' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
          <MousePointer2 className="w-4 h-4" /> Navegar
        </button>
        <button onClick={() => setInteractionMode('draw')} className={`px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${interactionMode === 'draw' ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-200 dark:ring-indigo-900' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
          <Layers className="w-4 h-4" /> Selecionar
        </button>
      </div>

      <div ref={containerRef} className={`flex-1 overflow-y-auto bg-slate-200/50 dark:bg-black/20 relative ${interactionMode === 'draw' ? 'touch-none cursor-crosshair' : 'touch-pan-y cursor-grab'}`} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onMouseLeave={handlePointerUp}>
        {processing && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/30 dark:bg-black/30 backdrop-blur-[2px]">
             <div className="bg-white dark:bg-slate-800 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-slate-100 dark:border-slate-700 animate-bounce">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Extraindo...</span>
             </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto py-20 px-2 md:px-6 space-y-6 pb-32">
          {visualData.images.map((imgPage) => (
            <div key={imgPage.page} className="relative shadow-xl bg-white rounded-lg overflow-hidden ring-1 ring-black/5 transition-shadow select-none" onPointerDown={(e) => handlePointerDown(e, imgPage.page)}>
              <img ref={el => imageRefs.current[imgPage.page] = el} src={imgPage.base64} className="w-full h-auto pointer-events-none block" onLoad={updateScales} />
              
              {confirmedTransactions
                .filter(tx => tx.box && tx.box.page === imgPage.page)
                .map(tx => (
                  <div
                    key={tx.id || Math.random()}
                    className="absolute bg-green-500/20 border-2 border-green-500 cursor-pointer hover:bg-red-500/40 hover:border-red-500 transition-colors z-20 rounded-sm group"
                    style={{
                      left: tx.box.x0 * (pageScales[imgPage.page]||1),
                      top: tx.box.top * (pageScales[imgPage.page]||1),
                      width: (tx.box.x1 - tx.box.x0) * (pageScales[imgPage.page]||1),
                      height: (tx.box.bottom - tx.box.top) * (pageScales[imgPage.page]||1)
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmedTransactions(prev => prev.filter(t => t.id !== tx.id));
                    }}
                  >
                    <div className="hidden group-hover:flex items-center justify-center w-full h-full"><Trash2 className="w-4 h-4 text-white drop-shadow-md" /></div>
                  </div>
                ))
              }
            </div>
          ))}
        </div>
        {selectionBox && <div className="fixed border-2 border-indigo-500 bg-indigo-500/20 z-50 pointer-events-none rounded backdrop-blur-[1px]" style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.width, height: selectionBox.height }} />}
      </div>

      <div className={`bg-white dark:bg-slate-900 z-40 border-t border-slate-200 dark:border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col ${isBottomSheetOpen ? 'h-[60vh]' : 'h-[90px]'}`}>
        <div onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)} className="px-6 h-[90px] flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prévia</span>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
              </span>
              <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-full border border-green-100 dark:border-green-900">
                {confirmedTransactions.length} itens
              </span>
            </div>
          </div>
          <button className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:bg-slate-200 transition-all">
            {isBottomSheetOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3 bg-slate-50/50 dark:bg-black/20">
          {confirmedTransactions.map((tx) => (
            <div key={tx.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-3">
              <div className="flex flex-col min-w-0 gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200">{tx.date || 'S/D'}</span>
                  {tx.installment && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-100">{tx.installment}</span>}
                </div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{tx.description}</span>
              </div>
              <div className="flex items-center gap-3 pl-2 border-l border-slate-100 dark:border-slate-800">
                <span className="text-sm font-bold text-slate-900 dark:text-white">{typeof tx.value === 'number' ? tx.value.toFixed(2) : tx.value}</span>
              </div>
            </div>
          ))}
        </div>

        {isBottomSheetOpen && (
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
             <button 
               onClick={() => setView('review')} 
               className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50" 
               disabled={confirmedTransactions.length === 0}
             >
               <Receipt className="w-5 h-5" /> REVISAR & EXPANDIR
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
