import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion'; 
import { Toaster, toast } from 'sonner'; 
import { 
  Upload, Loader2, Check, Trash2, MousePointer2, Layers, 
  ChevronDown, ChevronUp, Receipt, X, ScanLine, BrainCircuit, 
  Calendar, Wallet, Tag, CheckSquare, Square, Move, ShieldCheck, Zap, FileText
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient'; 

// =========================================================
// ⚙️ CONFIGURAÇÕES DE API
// =========================================================
const PYTHON_API_URL = 'https://finansmart-backend-119305932517.us-central1.run.app';
const EDGE_FUNCTION_URL = 'https://tggsnqafmsdldgvpjgdm.supabase.co/functions/v1/hyper-processor'; 

// =========================================================
// 🔮 LOADER FUTURISTA
// =========================================================
const FuturisticLoader = () => (
  <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden">
    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] animate-pulse"></div>
    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[100px] animate-pulse delay-700"></div>
    <div className="relative z-10 flex flex-col items-center">
      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 border-4 border-t-indigo-500 border-r-transparent border-b-violet-500 border-l-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-2 border-2 border-t-transparent border-r-cyan-400 border-b-transparent border-l-cyan-400 rounded-full animate-spin-reverse opacity-70"></div>
        <div className="absolute inset-0 flex items-center justify-center"><BrainCircuit className="w-12 h-12 text-white animate-pulse" /></div>
      </div>
      <h2 className="text-2xl font-bold text-white tracking-widest uppercase mb-2">Processando IA</h2>
      <div className="flex flex-col items-center gap-1">
        <span className="text-cyan-400 font-mono text-sm animate-pulse">Decodificando Fatura...</span>
        <span className="text-slate-500 text-xs">Identificando padrões e valores</span>
      </div>
    </div>
  </div>
);

// =========================================================
// 🚀 PÁGINA PRINCIPAL DO AUDITOR
// =========================================================
export default function SmartInvoiceAuditor() {
  const navigate = useNavigate();

  // --- STATES VISUAIS ---
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false); 
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visualData, setVisualData] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // MODO DE INTERAÇÃO
  const [interactionMode, setInteractionMode] = useState('scroll'); 
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  
  // STATES DE DADOS
  const [confirmedTransactions, setConfirmedTransactions] = useState([]);
  const [selectedTxIds, setSelectedTxIds] = useState(new Set()); 
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 7)); 
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accountsList, setAccountsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);

  // FERRAMENTA DE DESENHO
  const [selectionBox, setSelectionBox] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  
  // SCALING
  const [pageScales, setPageScales] = useState({});
  const imageRefs = useRef({});
  const containerRef = useRef(null);

  // 1. CARREGAR DADOS INICIAIS
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data: accounts } = await supabase.from('accounts').select('id, name, type').order('name');
        if (accounts) setAccountsList(accounts);
        const { data: categories } = await supabase.from('categories').select('id, name').eq('type', 'expense').order('name');
        if (categories) setCategoriesList(categories);
      } catch (error) { console.error(error); }
    };
    fetchInitialData();
  }, []);

  // 2. UPLOAD E DRAG & DROP
  const handleFileSelect = async (e) => {
    // Suporte tanto para input onChange quanto para onDrop
    const selectedFile = e.target.files ? e.target.files[0] : (e.dataTransfer ? e.dataTransfer.files[0] : null);
    
    if (!selectedFile) return;
    setFile(selectedFile);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${PYTHON_API_URL}/process_visual`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setVisualData(data.visual_data);
      if (data.visual_data.auto_transactions) {
        setConfirmedTransactions(data.visual_data.auto_transactions.map(tx => ({
            ...tx, id: tx.id || Math.random().toString(36).substr(2, 9), category_id: ''
        })));
      }
      setIsBottomSheetOpen(true); 
    } catch (err) {
      toast.error("Erro ao processar: " + err.message);
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e);
  };

  // 3. SELEÇÃO MANUAL
  const processManualSelection = async (boxRect, pageNum) => {
    if (!visualData || !boxRect) return;
    setProcessing(true);

    const pageMeta = visualData.text_map.find(p => p.page === pageNum);
    const currentScale = pageScales[pageNum] || 1;
    const imgRef = imageRefs.current[pageNum];
    
    if (!imgRef) { setProcessing(false); return; }

    const imgRect = imgRef.getBoundingClientRect();
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

    if (selectedWords.length > 0) {
      try {
        const response = await fetch(`${PYTHON_API_URL}/parse_selection`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ words: selectedWords })
        });
        const data = await response.json();
        if (data.transactions?.length > 0) {
            const newTxs = data.transactions.map(t => ({ 
              ...t, id: t.id || Math.random().toString(36).substr(2, 9),
              box: { ...relativeBox, page: pageNum }, category_id: ''
            }));
            setConfirmedTransactions(prev => [...prev, ...newTxs]);
            setInteractionMode('scroll'); 
            setIsBottomSheetOpen(true);
            toast.success(`${newTxs.length} item(s) adicionado(s)!`);
        }
      } catch (err) { console.error(err); }
    }
    setProcessing(false);
  };

  // 4. MOUSE EVENTS
  const handlePointerDown = (e, pageNum) => {
    if (interactionMode === 'scroll') return;
    if (e.cancelable) e.preventDefault(); 
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
    if (selectionBox && selectionBox.width > 10 && selectionBox.height > 10) {
        processManualSelection(selectionBox, selectionBox.page);
    }
    setSelectionBox(null);
  };

  // 5. HELPER: SCALING
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

  // 6. CATEGORIAS E SELEÇÃO
  const toggleSelection = (id) => {
    const newSet = new Set(selectedTxIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedTxIds(newSet);
  };
  const toggleSelectAll = () => {
    if (selectedTxIds.size === confirmedTransactions.length) setSelectedTxIds(new Set());
    else setSelectedTxIds(new Set(confirmedTransactions.map(t => t.id)));
  };
  const updateMassCategory = (categoryId) => {
    setConfirmedTransactions(prev => prev.map(tx => selectedTxIds.has(tx.id) ? { ...tx, category_id: categoryId } : tx));
    setSelectedTxIds(new Set()); 
    toast.success("Categoria aplicada!");
  };
  const updateCategory = (id, categoryId) => {
    setConfirmedTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, category_id: categoryId } : tx));
  };

  // 7. SALVAR FINAL
  const handleFinalSave = async () => {
    if (!selectedAccount) { toast.warning("Selecione a Conta."); return; }
    if (!invoiceDate) { toast.warning("Selecione o Mês."); return; }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada.");

      const payload = {
        transactions: confirmedTransactions,
        account_id: selectedAccount,
        invoice_reference_date: invoiceDate, 
        auto_expand_installments: true 
      };

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao salvar.");
      
      toast.success("Fatura importada com sucesso!");
      setTimeout(() => navigate('/dashboard'), 1500);

    } catch (err) { toast.error(err.message); } 
    finally { setSaving(false); }
  };

  const totalValue = confirmedTransactions.reduce((acc, cur) => { 
    const vStr = cur.value ? cur.value.toString().replace('R$', '').replace(/\./g, '').replace(',', '.').trim() : "0";
    const v = parseFloat(vStr); 
    return acc + (isNaN(v) ? 0 : v); 
  }, 0);

  // --- RENDER 1: HERO SECTION (LAYOUT FUTURISTA RESTAURADO) ---
  if (loading) return <FuturisticLoader />;

  if (!visualData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
        
        <Toaster position="top-center" richColors />

        {/* Background Decorative Blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
           <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px]" />
           <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 z-10">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-2xl text-center space-y-8"
          >
             {/* Header Section */}
             <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider shadow-sm">
                   <BrainCircuit className="w-3.5 h-3.5" /> FinanSmart AI 2.0
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                   Transforme Faturas em <br/>
                   <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">
                      Inteligência Financeira
                   </span>
                </h1>
                <p className="text-slate-500 text-lg max-w-lg mx-auto leading-relaxed">
                   Nossa IA analisa seu PDF, categoriza gastos e organiza parcelas automaticamente. Simples, rápido e seguro.
                </p>
             </div>

             {/* Dropzone Tecnológica */}
             <div 
               onDragOver={onDragOver}
               onDragLeave={onDragLeave}
               onDrop={onDrop}
               className={`
                  relative group cursor-pointer transition-all duration-300
                  ${isDragging ? 'scale-[1.02]' : 'hover:scale-[1.01]'}
               `}
             >
                <label className={`
                   block w-full aspect-[3/1] md:aspect-[4/1] bg-white rounded-3xl border-2 border-dashed 
                   flex flex-col items-center justify-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.08)]
                   transition-all duration-300 overflow-hidden
                   ${isDragging ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 group-hover:border-indigo-300'}
                `}>
                   <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
                   
                   <motion.div 
                      className="absolute top-0 left-0 w-1 h-full bg-indigo-500/30 blur-sm"
                      animate={{ left: ['0%', '100%', '0%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                   />

                   <div className="z-10 flex flex-col items-center">
                      <div className={`
                         w-16 h-16 rounded-2xl flex items-center justify-center mb-2 transition-all duration-300
                         ${isDragging ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-300' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'}
                      `}>
                         {isDragging ? <ScanLine className="w-8 h-8 animate-pulse" /> : <Upload className="w-7 h-7" />}
                      </div>
                      
                      <div className="text-center">
                         <p className="text-lg font-bold text-slate-800">
                            {isDragging ? 'Solte o arquivo para processar' : 'Clique ou arraste sua fatura PDF'}
                         </p>
                         <p className="text-sm text-slate-400 mt-1">
                            Suporta Nubank, Itaú, Bradesco e C6 Bank
                         </p>
                      </div>
                   </div>

                   <input type="file" accept="application/pdf" onChange={handleFileSelect} className="hidden" />
                </label>
             </div>

             {/* Trust Indicators */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                {[
                   { icon: ShieldCheck, title: "Dados Criptografados", desc: "Sua privacidade em 1º lugar", color: "text-emerald-500" },
                   { icon: Zap, title: "Processamento Real", desc: "Análise em segundos", color: "text-amber-500" },
                   { icon: FileText, title: "Detecção Automática", desc: "Data e parcelas inteligentes", color: "text-blue-500" }
                ].map((item, idx) => (
                   <div key={idx} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/60 border border-slate-100 shadow-sm backdrop-blur-sm">
                      <item.icon className={`w-6 h-6 ${item.color}`} />
                      <div className="text-center">
                         <h3 className="text-sm font-bold text-slate-800">{item.title}</h3>
                         <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                   </div>
                ))}
             </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // --- RENDER 2: EDITOR (COM CORREÇÕES DO FOOTER) ---
  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans selection:bg-indigo-100 relative overflow-hidden">
      
      <Toaster position="top-center" richColors closeButton />

      {/* MENU FLUTUANTE */}
      <motion.div drag dragMomentum={false} className="fixed top-8 left-0 right-0 mx-auto w-fit z-50 cursor-grab active:cursor-grabbing">
        <div className="bg-white p-1.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 flex items-center gap-1">
          <button onClick={() => setInteractionMode('scroll')} className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${interactionMode === 'scroll' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
            <MousePointer2 className="w-4 h-4" /> Navegar
          </button>
          <button onClick={() => setInteractionMode('draw')} className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${interactionMode === 'draw' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
            <Layers className="w-4 h-4" /> Selecionar
          </button>
          <div className="pl-2 pr-3 text-slate-300 border-l border-slate-200"><Move className="w-4 h-4" /></div>
        </div>
      </motion.div>


      {/* CANVAS */}
      <div 
        ref={containerRef}
        className={`flex-1 overflow-y-auto pb-64 pt-0 relative ${interactionMode === 'draw' ? 'touch-none cursor-crosshair' : 'touch-pan-y cursor-grab'}`}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
      >
        {processing && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
             <div className="bg-slate-900/90 backdrop-blur px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-slate-700 animate-in zoom-in duration-300">
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                <span className="text-sm font-bold text-white">Lendo Seleção...</span>
             </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto px-0 md:px-4 py-24 space-y-4">
          {visualData.images.map((imgPage) => {
            const pageNum = imgPage.page;
            return (
              <div key={pageNum} className="relative shadow-2xl bg-white rounded-none md:rounded-lg overflow-hidden ring-1 ring-slate-900/5 select-none" onPointerDown={(e) => handlePointerDown(e, pageNum)}>
                <img ref={el => imageRefs.current[pageNum] = el} src={imgPage.base64} className="w-full h-auto pointer-events-none block" onLoad={updateScales} />
                {confirmedTransactions
                  .filter(tx => tx.box && tx.box.page === pageNum)
                  .map(tx => {
                    const currentScale = pageScales[pageNum] || 1;
                    return (
                        <div key={tx.id} className="absolute bg-green-500/10 border-2 border-green-500 z-20 rounded-sm cursor-pointer hover:bg-red-500/20 hover:border-red-500 group"
                            style={{ left: tx.box.x0 * currentScale, top: tx.box.top * currentScale, width: (tx.box.x1 - tx.box.x0) * currentScale, height: (tx.box.bottom - tx.box.top) * currentScale }}
                            onClick={(e) => { e.stopPropagation(); setConfirmedTransactions(prev => prev.filter(t => t.id !== tx.id)); }}
                        >
                           <div className="hidden group-hover:flex items-center justify-center w-full h-full bg-red-500/20 backdrop-blur-[1px]">
                              <Trash2 className="w-4 h-4 text-red-600" />
                           </div>
                        </div>
                    );
                  })
                }
              </div>
            );
          })}
        </div>

        {selectionBox && (
          <div className="fixed border-2 border-indigo-500 bg-indigo-500/20 z-50 pointer-events-none rounded backdrop-blur-[1px] shadow-[0_0_15px_rgba(99,102,241,0.3)]" 
            style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.width, height: selectionBox.height }} 
          />
        )}
      </div>

      {/* GAVETA INFERIOR */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white z-[60] rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] transition-all duration-500 flex flex-col ${isBottomSheetOpen ? 'h-[85vh]' : 'h-[90px] translate-y-[0px]'}`}>
        
        <div onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)} className="px-6 h-[90px] flex items-center justify-between cursor-pointer border-b border-slate-100 bg-white/50 backdrop-blur-xl rounded-t-3xl shrink-0 hover:bg-slate-50 transition-colors">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Confirmado</span>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
              </span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                <Check className="w-3 h-3" /> {confirmedTransactions.length}
              </span>
            </div>
          </div>
          <button className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-400">
            {isBottomSheetOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 bg-slate-50/50">
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-2">
                   <Calendar className="w-3 h-3 text-indigo-500" /> Referência
                </label>
                <input type="month" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="w-full text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer"/>
             </div>
             <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-2">
                   <Wallet className="w-3 h-3 text-indigo-500" /> Conta / Cartão
                </label>
                <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="w-full text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer">
                   <option value="">Selecione...</option>
                   {accountsList.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
             </div>
          </div>

          {selectedTxIds.size > 0 && (
            <div className="sticky top-0 z-10 -mx-2 px-2 pb-2">
               <div className="animate-in slide-in-from-top-2 bg-slate-800 p-3 rounded-xl shadow-xl flex items-center gap-3 text-white">
                  <div className="flex-1 flex items-center gap-2">
                     <Tag className="w-4 h-4 text-indigo-400" />
                     <select onChange={(e) => updateMassCategory(e.target.value)} className="bg-transparent text-sm font-bold outline-none w-full cursor-pointer">
                        <option value="" className="text-slate-900">Categorizar ({selectedTxIds.size}) itens...</option>
                        {categoriesList.map(cat => <option key={cat.id} value={cat.id} className="text-slate-900">{cat.name}</option>)}
                     </select>
                  </div>
                  <button onClick={() => setSelectedTxIds(new Set())} className="p-1 hover:bg-white/10 rounded-full"><X className="w-4 h-4" /></button>
               </div>
            </div>
          )}
          
          <div className="flex items-center justify-between px-1">
             <button onClick={toggleSelectAll} className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-2 transition-colors">
               {selectedTxIds.size === confirmedTransactions.length && confirmedTransactions.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
               Selecionar Todos
             </button>
          </div>

          <div className="space-y-3">
            {confirmedTransactions.map((tx) => {
                const isSelected = selectedTxIds.has(tx.id);
                return (
                  <div key={tx.id || Math.random()} className={`bg-white p-4 rounded-2xl shadow-sm border transition-all duration-200 ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/10' : 'border-slate-100 hover:shadow-md'}`}>
                    <div className="flex gap-3">
                        <button onClick={() => toggleSelection(tx.id)} className={`mt-1 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-200 hover:text-slate-400'}`}>
                           {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </button>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex gap-2">
                                   <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{tx.date || 'S/D'}</span>
                                   {tx.installment && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">{tx.installment}</span>}
                                </div>
                                <span className="text-sm font-bold text-slate-900">{tx.value}</span>
                            </div>
                            <p className="text-sm font-medium text-slate-700 truncate mb-2">{tx.description}</p>
                            
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                               <Tag className="w-3 h-3 text-slate-300" />
                               <select value={tx.category_id || ''} onChange={(e) => updateCategory(tx.id, e.target.value)} className="flex-1 text-xs text-slate-500 bg-transparent outline-none cursor-pointer hover:text-indigo-600">
                                 <option value="">Sem Categoria</option>
                                 {categoriesList.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                               </select>
                               <button onClick={(e) => { e.stopPropagation(); setConfirmedTransactions(prev => prev.filter(t => t.id !== tx.id)); }} className="text-slate-300 hover:text-red-500 ml-2"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>
                    </div>
                  </div>
                );
            })}
          </div>
          <div className="h-24"></div>
        </div>

        {isBottomSheetOpen && (
          // FOOTER CORRIGIDO COM PADDING EXTRA (pb-28)
          <div className="p-4 bg-white border-t border-slate-100 shrink-0 pb-28">
             <button onClick={handleFinalSave} disabled={saving || confirmedTransactions.length === 0} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg shadow-slate-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800">
               {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Receipt className="w-5 h-5" />}
               {saving ? 'PROCESSANDO...' : 'CONFIRMAR IMPORTAÇÃO'}
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
