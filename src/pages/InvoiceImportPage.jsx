import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  Loader2,
  Check,
  Trash2,
  MousePointer2,
  Layers,
  ChevronDown,
  ChevronUp,
  Receipt,
  Sparkles,
  ArrowLeft,
  Save,
  Edit3,
  ClipboardList
} from "lucide-react";
import { format, isValid, parse } from "date-fns";

import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

// =====================================================
// 🌍 CONFIGURAÇÃO DE ENDPOINTS (CORRIGIDO)
// =====================================================

// 1. Backend Python (Cloud Run) - Apenas para processamento visual (OCR/Imagens)
const OCR_API_URL = "https://finansmart-backend-119305932517.us-central1.run.app";

// 2. Backend Supabase (Edge Function) - Para processar regras de negócio e salvar no Banco
// URL exata da sua função hyper-processor
const SUPABASE_PROJECT_URL = "https://tggsnqafmsdldgvpjgdm.supabase.co";
const EDGE_FUNCTION_URL = `${SUPABASE_PROJECT_URL}/functions/v1/hyper-processor`;

export default function InvoiceImportPage() {
  // ------------------ AUTENTICAÇÃO ------------------
  const { user } = useAuth();

  // ------------------ ESTADOS DE DADOS ------------------
  const [creditCards, setCreditCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);
  
  // Data de Referência da Fatura
  const [invoiceReferenceDate, setInvoiceReferenceDate] = useState(
    format(new Date(), "yyyy-MM")
  );

  // ------------------ ESTADOS DA UI ------------------
  const [view, setView] = useState("audit"); // 'audit' | 'review'
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [visualData, setVisualData] = useState(null);

  // Seleção e Desenho no Canvas
  const [interactionMode, setInteractionMode] = useState("scroll");
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const [pageScales, setPageScales] = useState({});
  const imageRefs = useRef({});
  const containerRef = useRef(null);

  // Transações Confirmadas
  const [confirmedTransactions, setConfirmedTransactions] = useState([]);
  const [autoExpandInstallments, setAutoExpandInstallments] = useState(true);

  // =====================================================
  // 🔗 CARREGAR DADOS INICIAIS
  // =====================================================
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        // Carrega Cartões
        const { data: cards } = await supabase
          .from("credit_cards")
          .select("id, name, last_4_digits, account_id")
          .order("name");
        setCreditCards(cards || []);
        if (cards?.length > 0 && !selectedCardId) setSelectedCardId(cards[0].id);

        // Carrega Categorias
        const { data: cats } = await supabase
          .from("categories")
          .select("id, name")
          .order("name");
        setCategories(cats || []);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      }
    };
    loadData();
  }, [user]);

  // =====================================================
  // LÓGICA DE TRANSAÇÕES (Adicionar/Editar/Remover)
  // =====================================================
  const addTransactions = (newItems) => {
    // Inicializa category_id como null para novos itens
    const itemsWithCategory = newItems.map(item => ({
        ...item,
        category_id: null 
    }));
    setConfirmedTransactions((prev) => [...prev, ...itemsWithCategory]);
  };

  const updateTransaction = (id, field, value) => {
    setConfirmedTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, [field]: value } : tx))
    );
  };

  const deleteTransaction = (id) => {
    setConfirmedTransactions((prev) => prev.filter((tx) => tx.id !== id));
  };

  const totalValue = confirmedTransactions.reduce((acc, cur) => {
    const v = parseFloat(
      cur.value?.toString().replace("R$", "").replace(/\./g, "").replace(",", ".").trim()
    );
    return acc + (Number.isNaN(v) ? 0 : v);
  }, 0);

  // =====================================================
  // ⚡ UPLOAD E PROCESSAMENTO VISUAL (OCR -> Python Cloud Run)
  // =====================================================
  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedCardId || !invoiceReferenceDate) {
        if (!selectedCardId) alert("Selecione um cartão de crédito.");
        if (!invoiceReferenceDate) alert("Selecione a data da fatura.");
        e.target.value = "";
        return;
    }

    setFile(selectedFile);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      // ⚠️ CHAMA O CLOUD RUN (Python) para ler o PDF
      const response = await fetch(`${OCR_API_URL}/process_visual`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
         const txt = await response.text();
         throw new Error("Falha no processamento visual: " + txt);
      }
      
      const data = await response.json();
      if (!data.visual_data) throw new Error("Dados visuais inválidos retornados pela IA.");

      setVisualData(data.visual_data);
      setConfirmedTransactions([]);
      setIsBottomSheetOpen(false);
    } catch (err) {
      alert("Erro ao processar PDF: " + err.message);
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // ✂️ SELEÇÃO MANUAL (OCR -> Python Cloud Run)
  // =====================================================
  const processManualSelection = async (boxRect, pageNum) => {
    if (!visualData || !boxRect) return;
    setProcessing(true);

    try {
      const pageMeta = visualData.text_map.find((p) => p.page === pageNum);
      const currentScale = pageScales[pageNum];
      const imgEl = imageRefs.current[pageNum];
      
      if (!pageMeta || !imgEl) return;

      const imgRect = imgEl.getBoundingClientRect();
      const relativeBox = {
        x0: (boxRect.x - imgRect.left) / currentScale,
        top: (boxRect.y - imgRect.top) / currentScale,
        x1: (boxRect.x + boxRect.width - imgRect.left) / currentScale,
        bottom: (boxRect.y + boxRect.height - imgRect.top) / currentScale
      };

      const selectedWords = pageMeta.words.filter((word) => {
        const wCx = word.x0 + (word.x1 - word.x0) / 2;
        const wCy = word.top + (word.bottom - word.top) / 2;
        return (
          wCx >= relativeBox.x0 && wCx <= relativeBox.x1 &&
          wCy >= relativeBox.top && wCy <= relativeBox.bottom
        );
      });

      if (selectedWords.length === 0) return;

      // ⚠️ CHAMA O CLOUD RUN (Python) para ler a seleção
      const response = await fetch(`${OCR_API_URL}/parse_selection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: selectedWords })
      });

      const data = await response.json();
      if (data.transactions?.length > 0) {
        addTransactions(data.transactions);
        setInteractionMode("scroll");
        setIsBottomSheetOpen(true);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao interpretar seleção.");
    } finally {
      setProcessing(false);
    }
  };

  // =====================================================
  // 💾 SALVAR FINAL (Edge Function Supabase)
  // =====================================================
  const sendToBackendForProcessing = async () => {
    if (!user || !selectedCardId || !invoiceReferenceDate || confirmedTransactions.length === 0) {
      alert("Verifique os dados antes de enviar.");
      return;
    }

    const selectedCard = creditCards.find((c) => c.id === selectedCardId);
    
    // Prepara payload
    const transactionsToSend = confirmedTransactions.map((tx) => ({
        original_id: tx.id,
        description: tx.description,
        value: tx.value,
        date: tx.date,
        installment: tx.installment || null,
        category_id: tx.category_id, // Envia a categoria individual
    }));

    const payload = {
        transactions: transactionsToSend,
        invoice_reference_date: invoiceReferenceDate,
        user_id: user.id,
        credit_card_id: selectedCardId,
        account_id: selectedCard.account_id,
        auto_expand_installments: autoExpandInstallments 
    };
    
    setProcessing(true);

    try {
      // ⚠️ CHAMA A EDGE FUNCTION DO SUPABASE (hyper-processor)
      // Removemos o header Authorization que causava o erro "process is not defined"
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erro na Edge Function (${response.status}): ${text}`);
      }
      
      const data = await response.json();
      
      alert(`Sucesso! ${data.inserted_count || 'Várias'} transações processadas e salvas.`);

      // Limpa e volta
      setConfirmedTransactions([]);
      setVisualData(null);
      setView("audit");
    } catch (err) {
      console.error("Erro no processamento:", err);
      alert("Erro ao salvar: " + err.message);
    } finally {
        setProcessing(false);
    }
  };

  // =====================================================
  // HELPERS DE INTERAÇÃO (CANVAS)
  // =====================================================
  const handlePointerDown = (e, pageNum) => {
    if (interactionMode === "scroll") return;
    e.preventDefault();
    const pos = getClientPos(e);
    setIsDrawing(true);
    startPos.current = pos;
    setSelectionBox({ x: pos.x, y: pos.y, width: 0, height: 0, page: pageNum });
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getClientPos(e);
    const width = pos.x - startPos.current.x;
    const height = pos.y - startPos.current.y;
    setSelectionBox(prev => ({
      ...prev,
      width: Math.abs(width),
      height: Math.abs(height),
      x: width > 0 ? startPos.current.x : pos.x,
      y: height > 0 ? startPos.current.y : pos.y
    }));
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (selectionBox?.width > 10 && selectionBox?.height > 10) {
      processManualSelection(selectionBox, selectionBox.page);
    }
    setSelectionBox(null);
  };

  const getClientPos = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX, y: clientY };
  };

  const updateScales = () => {
    if (!visualData) return;
    const newScales = {};
    visualData.images.forEach((img) => {
      const el = imageRefs.current[img.page];
      const meta = visualData.text_map.find((p) => p.page === img.page);
      if (el && meta) newScales[img.page] = el.offsetWidth / meta.width;
    });
    setPageScales(newScales);
  };

  useEffect(() => {
    window.addEventListener("resize", updateScales);
    return () => window.removeEventListener("resize", updateScales);
  }, [visualData]);


  // =====================================================
  // VIEW: REVIEW (LAYOUT ORIGINAL + CATEGORIA)
  // =====================================================
  if (view === "review") {
    return (
      <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              onClick={() => setView("audit")}
              className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors gap-1 font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar à Fatura
            </button>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">
              Revisão de Importação
            </h1>
            <div className="w-16" />
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Card de Resumo (Layout Original Azul) */}
            <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-xl flex justify-between items-center relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider">Total a Importar</p>
                <h2 className="text-3xl font-bold mt-1">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValue)}
                </h2>
              </div>
              <div className="text-right relative z-10">
                <p className="text-2xl font-bold">{confirmedTransactions.length}</p>
                <p className="text-indigo-200 text-xs">Lançamentos Originais</p>
              </div>
              <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -mr-10 -mt-10" />
            </div>

            {/* Lista (Layout Original Card Branco) */}
            <div className="space-y-3">
              {confirmedTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col gap-4 items-start transition-all hover:shadow-md"
                >
                    <div className="flex w-full items-start gap-4">
                        {/* Data e Parcela */}
                        <div className="flex flex-col items-center md:items-start gap-2 min-w-[100px]">
                            <input
                            value={tx.date}
                            onChange={(e) => updateTransaction(tx.id, "date", e.target.value)}
                            className="bg-transparent border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-1.5 rounded text-center w-24 outline-none focus:border-indigo-500"
                            />
                            {tx.installment && (
                                <span className="text-[10px] text-center text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-bold">
                                {tx.installment}
                                </span>
                            )}
                        </div>
                        
                        {/* Descrição */}
                        <div className="flex-1 w-full relative group">
                            <div className="absolute top-2.5 left-3 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                            <Edit3 className="w-3.5 h-3.5" />
                            </div>
                            <input
                            value={tx.description}
                            onChange={(e) => updateTransaction(tx.id, "description", e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-lg transition-all outline-none"
                            />
                        </div>
                        
                        {/* Valor */}
                        <div className="relative min-w-[120px]">
                            <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                            <input
                            value={tx.value ? tx.value.toString().replace("R$", "").trim() : ""}
                            onChange={(e) => updateTransaction(tx.id, "value", e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-right text-sm font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg focus:border-indigo-500 outline-none"
                            />
                        </div>
                        
                        {/* Botão de Excluir */}
                        <button
                            onClick={() => deleteTransaction(tx.id)}
                            className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Linha 2: Categoria (Obrigatório) */}
                    <div className="w-full flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                        <ClipboardList className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            Categoria:
                        </label>
                        <select
                            value={tx.category_id || ""}
                            onChange={(e) => updateTransaction(tx.id, "category_id", e.target.value)}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="" disabled>Selecione uma categoria</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 md:p-6 sticky bottom-0 z-20">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={sendToBackendForProcessing}
              className={`w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.99]
                ${processing ? "opacity-70 cursor-not-allowed" : ""}`}
              disabled={processing || confirmedTransactions.length === 0}
            >
              {processing ? (
                <><Loader2 className="animate-spin w-5 h-5" /> PROCESSANDO...</>
              ) : (
                <><Save className="w-5 h-5" /> CONFIRMAR E PROCESSAR ({confirmedTransactions.length})</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // VIEW: AUDIT INICIAL (UPLOAD)
  // =====================================================
  if (!visualData) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-lg text-center space-y-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-4 shadow-inner ring-8 ring-indigo-50 dark:ring-indigo-900/10">
            <Sparkles className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Importador Inteligente</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">IA + Visão Computacional</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Cartão:</label>
              <select
                value={selectedCardId || ""}
                onChange={(e) => setSelectedCardId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {creditCards.length === 0 && <option value="">Nenhum cadastrado</option>}
                {creditCards.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} {c.last_4_digits ? `•••• ${c.last_4_digits}` : ""}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Mês da Fatura:</label>
              <input
                type="month"
                value={invoiceReferenceDate}
                onChange={(e) => setInvoiceReferenceDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div
            className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setAutoExpandInstallments(!autoExpandInstallments)}
          >
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${autoExpandInstallments ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
              {autoExpandInstallments && <Check className="w-3 h-3 text-white" />}
            </div>
            <span>Expandir parcelas automaticamente</span>
          </div>

          <label className={`block group relative cursor-pointer ${loading ? "pointer-events-none opacity-80" : ""}`}>
            <div className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all group-hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3">
              {loading ? <><Loader2 className="animate-spin w-5 h-5" /> Processando...</> : <><Upload className="w-5 h-5" /> Carregar Fatura PDF</>}
            </div>
            <input type="file" accept="application/pdf" onChange={handleFileSelect} className="hidden" disabled={loading} />
          </label>
        </div>
      </div>
    );
  }

  // =====================================================
  // VIEW: AUDIT VISUAL (CANVAS)
  // =====================================================
  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-900 overflow-hidden font-sans relative">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 p-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg shadow-lg border border-slate-200 rounded-full">
        <button
          onClick={() => setInteractionMode("scroll")}
          className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${interactionMode === "scroll" ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}
        >
          <MousePointer2 className="w-3 h-3" /> Navegar
        </button>
        <button
          onClick={() => setInteractionMode("draw")}
          className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${interactionMode === "draw" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}
        >
          <Layers className="w-3 h-3" /> Selecionar
        </button>
      </div>

      <div
        ref={containerRef}
        className={`flex-1 overflow-y-auto bg-slate-200/50 dark:bg-black/20 relative ${interactionMode === "draw" ? "touch-none cursor-crosshair" : "touch-pan-y cursor-grab"}`}
        onPointerDown={(e) => isDrawing ? null : null} 
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {processing && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/30 backdrop-blur-[2px]">
            <div className="bg-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              <span className="text-sm font-bold text-slate-700">Lendo...</span>
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto py-20 px-2 md:px-6 space-y-6 pb-32">
          {visualData.images.map((imgPage) => (
            <div
              key={imgPage.page}
              className="relative shadow-xl bg-white rounded-lg overflow-hidden ring-1 ring-black/5 select-none"
              onPointerDown={(e) => handlePointerDown(e, imgPage.page)}
            >
              <img
                ref={(el) => (imageRefs.current[imgPage.page] = el)}
                src={imgPage.base64}
                className="w-full h-auto pointer-events-none block"
                onLoad={updateScales}
              />
            </div>
          ))}
        </div>

        {selectionBox && (
          <div
            className="fixed border-2 border-indigo-500 bg-indigo-500/20 z-50 pointer-events-none rounded"
            style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.width, height: selectionBox.height }}
          />
        )}
      </div>

      {/* Bottom Sheet Resumo */}
      <div className={`bg-white dark:bg-slate-900 z-40 border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-all duration-300 flex flex-col ${isBottomSheetOpen ? "h-[50vh]" : "h-[80px]"}`}>
        <div onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)} className="px-6 h-[80px] flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prévia</span>
            <div className="flex items-baseline gap-3">
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValue)}
              </span>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">{confirmedTransactions.length} itens</span>
            </div>
          </div>
          <button className="p-2 bg-slate-100 rounded-full text-slate-400">
            {isBottomSheetOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>

        {isBottomSheetOpen && (
            <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="space-y-2 mb-4">
                     {confirmedTransactions.map((tx) => (
                        <div key={tx.id} className="flex justify-between text-sm border-b py-2 border-slate-100">
                            <span className="truncate pr-4">{tx.description}</span>
                            <span className="font-bold whitespace-nowrap">{tx.value}</span>
                        </div>
                     ))}
                </div>
                <button
                onClick={() => setView("review")}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                <Receipt className="w-4 h-4" /> REVISAR & CATEGORIZAR
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
