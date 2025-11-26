import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Loader2, Check, Trash2, MousePointer2, Layers, 
  ChevronDown, ChevronUp, Receipt, Sparkles, ArrowLeft, Save, 
  Edit3, History, FastForward 
} from 'lucide-react';
import { addMonths, parse, format, isValid } from 'date-fns';

import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

// URL do backend (Cloud Run) alinhado com app.py
const API_URL = "https://finansmart-backend-119305932517.us-central1.run.app";

export default function InvoiceImportPage() {
  // --- CONTEXTO DE AUTENTICAÇÃO ---
  const { user } = useAuth();

  // --- CARTÕES DE CRÉDITO (TABELA credit_cards) ---
  const [creditCards, setCreditCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);

  // --- STATES ORIGINAIS ---
  const [view, setView] = useState('audit'); // 'audit' (Visual) | 'review' (Lista)
  
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [visualData, setVisualData] = useState(null);
  
  const [interactionMode, setInteractionMode] = useState('scroll'); 
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  
  const [selectionBox, setSelectionBox] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [confirmedTransactions, setConfirmedTransactions] = useState([]);
  const [autoExpandInstallments, setAutoExpandInstallments] = useState(true);

  const startPos = useRef({ x: 0, y: 0 });
  const [pageScales, setPageScales] = useState({});
  const imageRefs = useRef({});
  const containerRef = useRef(null);

  // =========================================================
  // 🧠 LÓGICA DE PARCELAMENTO INTELIGENTE (ORIGINAL)
  // =========================================================

  const expandTransaction = (tx) => {
    if (!tx.installment || !autoExpandInstallments) return [tx];

    try {
      const [current, total] = tx.installment.split('/').map(n => parseInt(n.trim()));
      if (!current || !total || isNaN(current) || isNaN(total)) return [tx];

      let dateObj = parse(tx.date, 'dd/MM', new Date());
      if (!isValid(dateObj)) {
        dateObj = parse(tx.date, 'dd/MM/yyyy', new Date());
        if (!isValid(dateObj)) return [tx];
      }

      const expandedItems = [];

      for (let i = 1; i <= total; i++) {
        const monthOffset = i - current;
        const newDate = addMonths(dateObj, monthOffset);
        
        let status = 'pending';
        let tag = 'Atual';
        
        if (i < current) {
            status = 'consolidated';
            tag = 'Passado';
        } else if (i > current) {
            status = 'scheduled';
            tag = 'Futuro';
        }

        expandedItems.push({
          ...tx,
          id: `${tx.id || tx.original_id || Date.now()}_inst_${i}`,
          date: format(newDate, 'dd/MM/yyyy'),
          description: `${tx.description} (${i}/${total})`,
          value: tx.value,
          installment: `${i}/${total}`,
          status,
          tag
        });
      }

      return expandedItems;

    } catch (e) {
      console.error("Erro ao expandir parcelas:", e);
      return [tx];
    }
  };

  const addTransactions = (newItems) => {
    let finalItems = [];
    
    newItems.forEach(item => {
        if (item.installment) {
            const expanded = expandTransaction(item);
            finalItems = [...finalItems, ...expanded];
        } else {
            finalItems.push(item);
        }
    });

    setConfirmedTransactions(prev => [...prev, ...finalItems]);
  };

  // =========================================================
  // 🔗 CARREGAR CARTÕES DE CRÉDITO DA TABELA credit_cards
  // =========================================================

  useEffect(() => {
    const loadCards = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('credit_cards')
          .select('id, name, last_4_digits, account_id')
          .order('name', { ascending: true });

        if (error) {
          console.error('Erro ao carregar cartões de crédito:', error);
          return;
        }

        setCreditCards(data || []);
        if (data && data.length > 0) {
          setSelectedCardId(data[0].id);
        }
      } catch (err) {
        console.error('Erro inesperado ao buscar cartões:', err);
      }
    };

    loadCards();
  }, [user]);

  // =========================================================
  // ⚡ UPLOAD E API (ALINHADO COM app.py /process_visual)
  // =========================================================

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedCardId) {
      alert("Selecione um cartão de crédito antes de importar a fatura.");
      e.target.value = "";
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
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erro HTTP ${response.status} – ${text.slice(0, 120)}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (!data.visual_data || !data.visual_data.images || !data.visual_data.text_map) {
        throw new Error("Resposta do servidor não contém 'visual_data' válido.");
      }
      
      setVisualData(data.visual_data);
      setConfirmedTransactions([]);
      setIsBottomSheetOpen(false);

    } catch (err) {
      alert("Erro ao processar PDF: " + err.message);
      console.error(err);
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const processManualSelection = async (boxRect, pageNum) => {
    if (!visualData || !boxRect) return;
    setProcessing(true);

    try {
      const pageMeta = visualData.text_map.find(p => p.page === pageNum);
      if (!pageMeta) throw new Error("Metadados da página não encontrados.");

      const currentScale = pageScales[pageNum];
      const imgEl = imageRefs.current[pageNum];
      if (!imgEl || !currentScale) throw new Error("Escala da página ainda não calculada.");

      const imgRect = imgEl.getBoundingClientRect();

      const relativeBox = {
        x0: (boxRect.x - imgRect.left) / currentScale,
        top: (boxRect.y - imgRect.top) / currentScale,
        x1: (boxRect.x + boxRect.width - imgRect.left) / currentScale,
        bottom: (boxRect.y + boxRect.height - imgRect.top) / currentScale
      };

      const selectedWords = pageMeta.words.filter(word => {
        const wCx = word.x0 + (word.x1 - word.x0) / 2;
        const wCy = word.top + (word.bottom - word.top) / 2;
        return (
          wCx >= relativeBox.x0 &&
          wCx <= relativeBox.x1 &&
          wCy >= relativeBox.top &&
          wCy <= relativeBox.bottom
        );
      });

      if (selectedWords.length === 0) {
        setProcessing(false);
        return;
      }

      const response = await fetch(`${API_URL}/parse_selection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ words: selectedWords })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erro HTTP ${response.status} – ${text.slice(0, 120)}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.transactions?.length > 0) {
          addTransactions(data.transactions);
          setInteractionMode('scroll'); 
          setIsBottomSheetOpen(true);
      }
    } catch (err) { 
      console.error(err); 
      alert("Erro ao interpretar seleção: " + err.message);
    } 
    finally { 
      setProcessing(false); 
    }
  };

  // =========================================================
  // EVENTOS DE DESENHO / SELEÇÃO (ORIGINAIS)
  // =========================================================
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
    setSelectionBox(prev => ({
      ...prev,
      width: Math.abs(width),
      height: Math.abs(height),
      x: width > 0 ? startPos.current.x : clientX,
      y: height > 0 ? startPos.current.y : clientY
    }));
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (selectionBox && selectionBox.width > 10 && selectionBox.height > 10) {
      processManualSelection(selectionBox, selectionBox.page);
    }
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

  useEffect(() => { 
    window.addEventListener('resize', updateScales); 
    return () => window.removeEventListener('resize', updateScales); 
  }, [visualData]);

  // --- EDIÇÃO (ORIGINAL) ---
  const updateTransaction = (id, field, value) => {
    setConfirmedTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, [field]: value } : tx));
  };

  const deleteTransaction = (id) => {
    setConfirmedTransactions(prev => prev.filter(tx => tx.id !== id));
  };

  const totalValue = confirmedTransactions.reduce((acc, cur) => { 
    const v = parseFloat(
      cur.value
        ?.toString()
        .replace('R$', '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim()
    ); 
    return acc + (isNaN(v) ? 0 : v); 
  }, 0);

  // =========================================================
  // 💾 SALVAR TRANSACOES NA SUPABASE
  // =========================================================
  const saveTransactions = async () => {
    if (!user) {
      alert("Usuário não autenticado.");
      return;
    }

    if (!selectedCardId) {
      alert("Selecione um cartão antes de confirmar a importação.");
      return;
    }

    if (confirmedTransactions.length === 0) {
      alert("Nenhuma transação para salvar.");
      return;
    }

    const payload = confirmedTransactions.map((tx) => ({
      user_id: user.id,
      credit_card_id: selectedCardId,        // campo que referencia credit_cards.id
      description: tx.description,
      date: tx.date,                         // você pode converter para ISO se sua tabela exigir
      installment: tx.installment || null,
      created_at: new Date().toISOString(),
      amount: Number(                        // ajuste o nome do campo (amount/value) conforme sua tabela
        tx.value
          ?.toString()
          .replace("R$", "")
          .replace(/\./g, "")
          .replace(",", ".")
      )
    }));

    try {
      const { error } = await supabase.from("transactions").insert(payload);

      if (error) {
        console.error("Erro ao salvar na tabela transactions:", error);
        alert("Erro ao salvar na base de dados: " + error.message);
        return;
      }

      alert("Transações importadas com sucesso!");

      // reset fluxo
      setConfirmedTransactions([]);
      setVisualData(null);
      setView('audit');
    } catch (err) {
      console.error("Erro inesperado ao salvar transações:", err);
      alert("Erro inesperado ao salvar transações.");
    }
  };

  // =========================================================
  // VIEW: REVIEW & IMPORT (ORIGINAL, SÓ TROCOU onClick)
  // =========================================================
  if (view === 'review') {
    return (
      <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 font-sans animate-in slide-in-from-right-8 duration-500">
        
        {/* Header Fixo */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <button 
              onClick={() => setView('audit')} 
              className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors gap-1 font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar à Fatura
            </button>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">
              Revisão de Importação
            </h1>
            <div className="w-16"></div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* Card de Resumo */}
            <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-xl flex justify-between items-center relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider">
                  Total a Importar
                </p>
                <h2 className="text-3xl font-bold mt-1">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                </h2>
              </div>
              <div className="text-right relative z-10">
                <p className="text-2xl font-bold">{confirmedTransactions.length}</p>
                <p className="text-indigo-200 text-xs">Lançamentos</p>
              </div>
              <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            </div>

            {/* Lista */}
            <div className="space-y-3">
              {confirmedTransactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className={`
                    bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center transition-all hover:shadow-md
                    ${tx.tag === 'Passado' ? 'border-slate-200 opacity-70 bg-slate-50' : ''}
                    ${tx.tag === 'Futuro' ? 'border-indigo-100 bg-indigo-50/30' : ''}
                    ${tx.tag === 'Atual' ? 'border-slate-200 dark:border-slate-700' : ''}
                  `}
                >
                  <div className="flex md:flex-col items-center md:items-start gap-2 min-w-[100px]">
                    <input 
                      value={tx.date} 
                      onChange={(e) => updateTransaction(tx.id, 'date', e.target.value)}
                      className="bg-transparent border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-1.5 rounded text-center w-24 outline-none focus:border-indigo-500"
                    />
                    <div className="flex gap-1">
                      {tx.installment && (
                        <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-bold">
                          {tx.installment}
                        </span>
                      )}
                      {tx.tag && tx.tag !== 'Atual' && (
                        <span
                          className={`
                            text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1
                            ${tx.tag === 'Passado' ? 'text-slate-500 bg-slate-200' : 'text-indigo-600 bg-indigo-100'}
                          `}
                        >
                          {tx.tag === 'Passado' ? (
                            <History className="w-3 h-3" />
                          ) : (
                            <FastForward className="w-3 h-3" />
                          )}
                          {tx.tag}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 w-full relative group">
                    <div className="absolute top-2.5 left-3 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                      <Edit3 className="w-3.5 h-3.5" />
                    </div>
                    <input 
                      value={tx.description}
                      onChange={(e) => updateTransaction(tx.id, 'description', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-lg transition-all outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                      <input 
                        value={tx.value ? tx.value.toString().replace('R$', '').trim() : ''}
                        onChange={(e) => updateTransaction(tx.id, 'value', e.target.value)}
                        className="w-28 pl-8 pr-3 py-2 text-right text-sm font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <button 
                      onClick={() => deleteTransaction(tx.id)}
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer de Ação - AGORA SALVA NA SUPABASE */}
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 md:p-6 sticky bottom-0 z-20">
          <div className="max-w-3xl mx-auto">
            <button 
              onClick={saveTransactions}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.99]"
            >
              <Save className="w-5 h-5" /> CONFIRMAR IMPORTAÇÃO
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // VIEW: AUDIT (INICIAL) — SEM VISUALDATA
  // =========================================================
  if (!visualData) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-sm text-center space-y-8 animate-in fade-in duration-700">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-4 shadow-inner ring-8 ring-indigo-50 dark:ring-indigo-900/10">
            <Sparkles className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Importador Inteligente
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
              IA + Visão Computacional
            </p>
          </div>
          
          {/* DROPDOWN CARTÃO DE CRÉDITO */}
          <div className="text-left space-y-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Selecione o cartão de crédito:
            </label>
            <select
              value={selectedCardId || ''}
              onChange={(e) => setSelectedCardId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {creditCards.length === 0 && (
                <option value="">Nenhum cartão cadastrado</option>
              )}
              {creditCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name}
                  {card.last_4_digits ? ` •••• ${card.last_4_digits}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Configuração de Parcelas (original) */}
          <div
            className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer"
            onClick={() => setAutoExpandInstallments(!autoExpandInstallments)}
          >
            <div
              className={`
                w-5 h-5 rounded border flex items-center justify-center transition-colors
                ${autoExpandInstallments ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}
              `}
            >
              {autoExpandInstallments && <Check className="w-3 h-3 text-white" />}
            </div>
            <span>Expandir parcelas automaticamente</span>
          </div>

          {/* Botão de Upload (original) */}
          <label
            className={`block group relative cursor-pointer ${loading ? 'pointer-events-none opacity-80' : ''}`}
          >
            <div className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all group-hover:scale-[1.02] group-active:scale-95 flex items-center justify-center gap-3">
               {loading ? (
                 <>
                   <Loader2 className="animate-spin w-5 h-5" /> Processando PDF...
                 </>
               ) : (
                 <>
                   <Upload className="w-5 h-5" /> Carregar Fatura
                 </>
               )}
            </div>
            <input 
              type="file" 
              accept="application/pdf" 
              onChange={handleFileSelect} 
              className="hidden" 
              disabled={loading}
            />
          </label>
        </div>
      </div>
    );
  }

  // =========================================================
  // VIEW: AUDIT (VISUAL COM PDF + DESENHO LIVRE ORIGINAL)
  // =========================================================
  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-900 overflow-hidden font-sans relative">
      
      {/* Barra Flutuante (original) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 p-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg shadow-lg border border-slate-200 dark:border-slate-700 rounded-full transition-all scale-90 sm:scale-100">
        <button
          onClick={() => setInteractionMode('scroll')}
          className={`
            px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all
            ${interactionMode === 'scroll'
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }
          `}
        >
          <MousePointer2 className="w-4 h-4" /> Navegar
        </button>
        <button
          onClick={() => setInteractionMode('draw')}
          className={`
            px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all
            ${interactionMode === 'draw'
              ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-200 dark:ring-indigo-900'
              : 'text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }
          `}
        >
          <Layers className="w-4 h-4" /> Selecionar
        </button>
      </div>

      {/* Canvas da Fatura (original) */}
      <div
        ref={containerRef}
        className={`
          flex-1 overflow-y-auto bg-slate-200/50 dark:bg-black/20 relative
          ${interactionMode === 'draw' ? 'touch-none cursor-crosshair' : 'touch-pan-y cursor-grab'}
        `}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
      >
        {processing && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/30 dark:bg-black/30 backdrop-blur-[2px]">
             <div className="bg-white dark:bg-slate-800 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-slate-100 dark:border-slate-700 animate-bounce">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Extraindo...
                </span>
             </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto py-20 px-2 md:px-6 space-y-6 pb-32">
          {visualData.images.map((imgPage) => (
            <div
              key={imgPage.page}
              className="relative shadow-xl bg-white rounded-lg overflow-hidden ring-1 ring-black/5 transition-shadow select-none"
              onPointerDown={(e) => handlePointerDown(e, imgPage.page)}
            >
              <img
                ref={el => imageRefs.current[imgPage.page] = el}
                src={imgPage.base64}
                className="w-full h-auto pointer-events-none block"
                onLoad={updateScales}
              />
              
              {confirmedTransactions
                .filter(tx => tx.box && tx.box.page === imgPage.page)
                .map(tx => (
                  <div
                    key={tx.id || Math.random()}
                    className="absolute bg-green-500/20 border-2 border-green-500 cursor-pointer hover:bg-red-500/40 hover:border-red-500 transition-colors z-20 rounded-sm group"
                    style={{
                      left: tx.box.x0 * (pageScales[imgPage.page] || 1),
                      top: tx.box.top * (pageScales[imgPage.page] || 1),
                      width: (tx.box.x1 - tx.box.x0) * (pageScales[imgPage.page] || 1),
                      height: (tx.box.bottom - tx.box.top) * (pageScales[imgPage.page] || 1)
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmedTransactions(prev => prev.filter(t => t.id !== tx.id));
                    }}
                  >
                    <div className="hidden group-hover:flex items-center justify-center w-full h-full">
                      <Trash2 className="w-4 h-4 text-white drop-shadow-md" />
                    </div>
                  </div>
                ))
              }
            </div>
          ))}
        </div>

        {selectionBox && (
          <div
            className="fixed border-2 border-indigo-500 bg-indigo-500/20 z-50 pointer-events-none rounded backdrop-blur-[1px]"
            style={{
              left: selectionBox.x,
              top: selectionBox.y,
              width: selectionBox.width,
              height: selectionBox.height
            }}
          />
        )}
      </div>

      {/* Bottom Sheet (original) */}
      <div
        className={`
          bg-white dark:bg-slate-900 z-40 border-t border-slate-200 dark:border-slate-800
          shadow-[0_-10px_40px_rgba(0,0,0,0.1)]
          transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
          flex flex-col
          ${isBottomSheetOpen ? 'h-[60vh]' : 'h-[90px]'}
        `}
      >
        <div
          onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)}
          className="px-6 h-[90px] flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Prévia
            </span>
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
            {isBottomSheetOpen ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3 bg-slate-50/50 dark:bg-black/20">
          {confirmedTransactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-3"
            >
              <div className="flex flex-col min-w-0 gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {tx.date || 'S/D'}
                  </span>
                  {tx.installment && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                      {tx.installment}
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {tx.description}
                </span>
              </div>
              <div className="flex items-center gap-3 pl-2 border-l border-slate-100 dark:border-slate-800">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {typeof tx.value === 'number' ? tx.value.toFixed(2) : tx.value}
                </span>
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
