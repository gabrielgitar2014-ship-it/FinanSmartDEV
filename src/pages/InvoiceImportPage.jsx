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
  History,
  FastForward,
  ClipboardList 
} from "lucide-react";
import { parse, format, isValid, parseISO } from "date-fns";

import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

// URL do backend (Cloud Run) alinhado com app.py
const API_URL =
  "https://finansmart-backend-119305932517.us-central1.run.app";

// NOVO ENDPOINT SIMULADO para a Edge Function
const EDGE_FUNCTION_URL = `${API_URL}/process_invoice_transactions`; 

export default function InvoiceImportPage() {
  // ------------------ AUTENTICAÇÃO ------------------
  const { user } = useAuth();

  // ------------------ CARTÕES, CATEGORIAS E DATAS ------------------
  const [creditCards, setCreditCards] = useState([]);
  const [categories, setCategories] = useState([]); 
  const [selectedCardId, setSelectedCardId] = useState(null);
  
  // Mês de referência da fatura para cálculo do ano no backend
  const [invoiceReferenceDate, setInvoiceReferenceDate] = useState(
    format(new Date(), "yyyy-MM")
  ); 

  // ------------------ STATES ORIGINAIS ------------------
  const [view, setView] = useState("audit");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [visualData, setVisualData] = useState(null);

  const [interactionMode, setInteractionMode] = useState("scroll");
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const [selectionBox, setSelectionBox] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // confirmedTransactions armazena ITENS ORIGINAIS (não expandidos)
  const [confirmedTransactions, setConfirmedTransactions] = useState([]);
  const [autoExpandInstallments, setAutoExpandInstallments] =
    useState(true); 

  const startPos = useRef({ x: 0, y: 0 });
  const [pageScales, setPageScales] = useState({});
  const imageRefs = useRef({});
  const containerRef = useRef(null);

  // =====================================================
  // 👁‍🗨 HELPER: PARSE DE DATA
  // =====================================================
  const parseToISODate = (dateStr) => {
    if (!dateStr) return format(new Date(), "yyyy-MM-dd");

    let d = parse(dateStr, "dd/MM/yyyy", new Date());
    if (!isValid(d)) {
      d = parse(dateStr, "dd/MM", new Date());
    }
    if (!isValid(d)) return format(new Date(), "yyyy-MM-dd");
    return format(d, "yyyy-MM-dd");
  };

  // =====================================================
  // 🧠 LÓGICA DE TRANSAÇÃO (SIMPLIFICADA)
  // =====================================================
  // Removida: expandTransaction

  const addTransactions = (newItems) => {
    let finalItems = newItems.map(item => ({
        ...item,
        category_id: null, // Inicializa a categoria
    }));

    setConfirmedTransactions((prev) => [...prev, ...finalItems]);
  };

  // =====================================================
  // 🔗 CARREGAR CARTÕES E CATEGORIAS
  // =====================================================
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        // 1. Carregar Cartões
        const { data: cardsData, error: cardsError } = await supabase
          .from("credit_cards")
          .select("id, name, last_4_digits, account_id")
          .order("name", { ascending: true });

        if (cardsError) {
          console.error("Erro ao carregar cartões de crédito:", cardsError);
          return;
        }

        setCreditCards(cardsData || []);
        if (cardsData && cardsData.length > 0 && !selectedCardId) {
          setSelectedCardId(cardsData[0].id);
        }

        // 2. Carregar Categorias
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("id, name")
          .order("name", { ascending: true });

        if (categoriesError) {
             console.error("Erro ao carregar categorias:", categoriesError);
             return;
        }

        setCategories(categoriesData || []);

      } catch (err) {
        console.error("Erro inesperado ao buscar dados:", err);
      }
    };

    loadData();
  }, [user, selectedCardId]);


  // =====================================================
  // ⚡ UPLOAD DO PDF (process_visual)
  // =====================================================
  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedCardId) {
      alert("Selecione um cartão de crédito antes de importar a fatura.");
      e.target.value = "";
      return;
    }
    
    if (!invoiceReferenceDate) {
        alert("Selecione o Mês/Ano de referência da fatura.");
        e.target.value = "";
        return;
    }


    setFile(selectedFile);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`${API_URL}/process_visual`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Erro HTTP ${response.status} – ${text.slice(0, 120)}`
        );
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (
        !data.visual_data ||
        !data.visual_data.images ||
        !data.visual_data.text_map
      ) {
        throw new Error(
          "Resposta do servidor não contém 'visual_data' válido."
        );
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

  // =====================================================
  // ✂️ PROCESSAR SELEÇÃO MANUAL (parse_selection) - CORRIGIDO
  // =====================================================
  const processManualSelection = async (boxRect, pageNum) => {
    if (!visualData || !boxRect) return;
    setProcessing(true);

    try {
      const pageMeta = visualData.text_map.find(
        (p) => p.page === pageNum
      );
      if (!pageMeta) throw new Error("Metadados da página não encontrados.");

      const currentScale = pageScales[pageNum];
      const imgEl = imageRefs.current[pageNum];
      if (!imgEl || !currentScale) {
        throw new Error("Escala da página ainda não calculada.");
      }

      const imgRect = imgEl.getBoundingClientRect();

      const relativeBox = {
        x0: (boxRect.x - imgRect.left) / currentScale,
        top: (boxRect.y - imgRect.top) / currentScale,
        x1:
          (boxRect.x + boxRect.width - imgRect.left) / currentScale,
        bottom:
          (boxRect.y + boxRect.height - imgRect.top) / currentScale
      };

      const selectedWords = pageMeta.words.filter((word) => { // VARIÁVEL DEFINIDA AQUI
        const wCx = word.x0 + (word.x1 - word.x0) / 2;
        const wCy = word.top + (word.bottom - word.top) / 2;
        return (
          wCx >= relativeBox.x0 &&
          wCx <= relativeBox.x1 &&
          wCy >= relativeBox.top &&
          wCy <= relativeBox.bottom
        );
      });
      
      // Corrigindo: Se selectedWords for vazio, retornamos explicitamente.
      // O ReferenceError não deve ocorrer se o código chegar aqui.
      if (selectedWords.length === 0) {
        setProcessing(false);
        alert("Nenhuma palavra detectada na área selecionada. Tente desenhar uma área maior.");
        return; 
      }

      // USO SEGURO da variável selectedWords
      const response = await fetch(`${API_URL}/parse_selection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: selectedWords })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Erro HTTP ${response.status} – ${text.slice(0, 120)}`
        );
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.transactions?.length > 0) {
        addTransactions(data.transactions);
        setInteractionMode("scroll");
        setIsBottomSheetOpen(true);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao interpretar seleção: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // =====================================================
  // 🖱️ EVENTOS DE DESENHO / SELEÇÃO
  // =====================================================
  const handlePointerDown = (e, pageNum) => {
    if (interactionMode === "scroll") return;
    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    setIsDrawing(true);
    startPos.current = { x: clientX, y: clientY };
    setSelectionBox({
      x: clientX,
      y: clientY,
      width: 0,
      height: 0,
      page: pageNum
    });
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const width = clientX - startPos.current.x;
    const height = clientY - startPos.current.y;

    setSelectionBox((prev) => ({
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

    if (
      selectionBox &&
      selectionBox.width > 10 &&
      selectionBox.height > 10
    ) {
      processManualSelection(selectionBox, selectionBox.page);
    }

    setSelectionBox(null);
  };

  const updateScales = () => {
    if (!visualData) return;
    const newScales = {};
    visualData.images.forEach((img) => {
      const el = imageRefs.current[img.page];
      const meta = visualData.text_map.find(
        (p) => p.page === img.page
      );
      if (el && meta) {
        newScales[img.page] = el.offsetWidth / meta.width;
      }
    });
    setPageScales(newScales);
  };

  useEffect(() => {
    window.addEventListener("resize", updateScales);
    return () => window.removeEventListener("resize", updateScales);
  }, [visualData]);

  // =====================================================
  // 📝 EDIÇÃO NA REVIEW
  // =====================================================
  const updateTransaction = (id, field, value) => {
    setConfirmedTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, [field]: value } : tx))
    );
  };

  const deleteTransaction = (id) => {
    setConfirmedTransactions((prev) =>
      prev.filter((tx) => tx.id !== id)
    );
  };

  const totalValue = confirmedTransactions.reduce((acc, cur) => {
    const v = parseFloat(
      cur.value
        ?.toString()
        .replace("R$", "")
        .replace(/\./g, "")
        .replace(",", ".")
        .trim()
    );
    return acc + (Number.isNaN(v) ? 0 : v);
  }, 0);

  // =====================================================
  // 💾 ENVIAR PARA EDGE FUNCTION
  // =====================================================
  const sendToBackendForProcessing = async () => {
    if (!user) {
      alert("Usuário não autenticado.");
      return;
    }

    if (!selectedCardId || !invoiceReferenceDate) {
      alert("Selecione o cartão e a data de referência da fatura.");
      return;
    }

    if (confirmedTransactions.length === 0) {
      alert("Nenhuma transação para salvar.");
      return;
    }

    const selectedCard = creditCards.find(
      (c) => c.id === selectedCardId
    );
    if (!selectedCard) {
      alert("Cartão selecionado não encontrado.");
      return;
    }
    
    // Validação da Categoria
    const missingCategory = confirmedTransactions.some(tx => !tx.category_id);
    if (missingCategory) {
        alert("Por favor, selecione uma categoria para todas as transações.");
        return;
    }
    
    // Monta o payload com todas as transações ORIGINAIS, incluindo Categoria
    const transactionsToSend = confirmedTransactions.map((tx) => ({
        original_id: tx.id,
        description: tx.description,
        value: tx.value,
        date: tx.date, 
        installment: tx.installment || null,
        category_id: tx.category_id,
    }));

    // Payload principal para a Edge Function
    const payload = {
        transactions: transactionsToSend,
        invoice_reference_date: invoiceReferenceDate,
        user_id: user.id,
        credit_card_id: selectedCardId,
        account_id: selectedCard.account_id,
        auto_expand_installments: autoExpandInstallments, // Envia a preferência do usuário
    };
    
    setProcessing(true);

    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Erro HTTP ${response.status} – ${text.slice(0, 120)}`
        );
      }
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      alert("Transações importadas e processadas com sucesso!");

      setConfirmedTransactions([]);
      setVisualData(null);
      setView("audit");
    } catch (err) {
      console.error("Erro ao enviar transações para processamento:", err);
      alert("Erro ao processar transações: " + err.message);
    } finally {
        setProcessing(false);
    }
  };

  // =====================================================
  // VIEW: REVIEW (LISTA EDITÁVEL)
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
              Revisão e Categorização
            </h1>
            <div className="w-16" />
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Card de Resumo */}
            <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-xl flex justify-between items-center relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider">
                  Total das Transações
                </p>
                <h2 className="text-3xl font-bold mt-1">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  }).format(totalValue)}
                </h2>
              </div>
              <div className="text-right relative z-10">
                <p className="text-2xl font-bold">
                  {confirmedTransactions.length}
                </p>
                <p className="text-indigo-200 text-xs">Lançamentos Originais</p>
              </div>
              <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -mr-10 -mt-10" />
            </div>

            {/* Lista */}
            <div className="space-y-3">
              {confirmedTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className={`bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm flex flex-col gap-4 items-start transition-all hover:shadow-md border-slate-200 dark:border-slate-700`}
                >
                    <div className="flex w-full items-start gap-4">
                        {/* Data e Parcela */}
                        <div className="flex flex-col items-center md:items-start gap-2 min-w-[100px]">
                            <input
                            value={tx.date}
                            onChange={(e) =>
                                updateTransaction(tx.id, "date", e.target.value)
                            }
                            className="bg-transparent border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-1.5 rounded text-center w-24 outline-none focus:border-indigo-500"
                            />
                            {tx.installment && (
                                <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-bold">
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
                            onChange={(e) =>
                                updateTransaction(
                                tx.id,
                                "description",
                                e.target.value
                                )
                            }
                            className="w-full pl-9 pr-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-lg transition-all outline-none"
                            />
                        </div>
                        
                        {/* Valor */}
                        <div className="relative min-w-[120px]">
                            <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">
                                R$
                            </span>
                            <input
                            value={
                                tx.value
                                ? tx.value.toString().replace("R$", "").trim()
                                : ""
                            }
                            onChange={(e) =>
                                updateTransaction(tx.id, "value", e.target.value)
                            }
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
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 min-w-[70px]">
                            Categoria:
                        </label>
                        <select
                            value={tx.category_id || ""}
                            onChange={(e) => updateTransaction(tx.id, "category_id", e.target.value)}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="" disabled>
                                Selecione uma categoria
                            </option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
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
                <>
                  <Loader2 className="animate-spin w-5 h-5" /> PROCESSANDO...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" /> CONFIRMAR E PROCESSAR ({confirmedTransactions.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // VIEW: AUDIT INICIAL 
  // =====================================================
  if (!visualData) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-lg text-center space-y-8">
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

          {/* CONTÊINER FLEX PARA CARTÃO E DATA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            {/* Dropdown cartão */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Selecione o cartão:
              </label>
              <select
                value={selectedCardId || ""}
                onChange={(e) => setSelectedCardId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {creditCards.length === 0 && (
                  <option value="">Nenhum cartão cadastrado</option>
                )}
                {creditCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                    {card.last_4_digits
                      ? ` •••• ${card.last_4_digits}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* CAMPO: Mês/Ano de Referência da Fatura */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Mês/Ano da Fatura:
              </label>
              <input
                type="month"
                value={invoiceReferenceDate}
                onChange={(e) => setInvoiceReferenceDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Toggle parcelas */}
          <div
            className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer"
            onClick={() =>
              setAutoExpandInstallments(!autoExpandInstallments)
            }
          >
            <div
              className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                autoExpandInstallments
                  ? "bg-indigo-600 border-indigo-600"
                  : "border-slate-300"
              }`}
            >
              {autoExpandInstallments && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
            <span>Expandir parcelas no Backend (Recomendado)</span>
          </div>

          {/* Upload */}
          <label
            className={`block group relative cursor-pointer ${
              loading ? "pointer-events-none opacity-80" : ""
            }`}
          >
            <div className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all group-hover:scale-[1.02] group-active:scale-95 flex items-center justify-center gap-3">
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5" /> Processando
                  PDF...
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

  // =====================================================
  // VIEW: AUDIT COM VISUALDATA
  // =====================================================
  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-900 overflow-hidden font-sans relative">
      {/* Barra Flutuante */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 p-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg shadow-lg border border-slate-200 dark:border-slate-700 rounded-full">
        <button
          onClick={() => setInteractionMode("scroll")}
          className={`px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${
            interactionMode === "scroll"
              ? "bg-slate-800 text-white shadow-md"
              : "text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          <MousePointer2 className="w-4 h-4" /> Navegar
        </button>
        <button
          onClick={() => setInteractionMode("draw")}
          className={`px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${
            interactionMode === "draw"
              ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-200 dark:ring-indigo-900"
              : "text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          <Layers className="w-4 h-4" /> Selecionar
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-y-auto bg-slate-200/50 dark:bg-black/20 relative ${
          interactionMode === "draw"
            ? "touch-none cursor-crosshair"
            : "touch-pan-y cursor-grab"
        }`}
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
            style={{
              left: selectionBox.x,
              top: selectionBox.y,
              width: selectionBox.width,
              height: selectionBox.height
            }}
          />
        )}
      </div>

      {/* Bottom Sheet */}
      <div
        className={`bg-white dark:bg-slate-900 z-40 border-t border-slate-200 dark:border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-all duration-500 flex flex-col ${
          isBottomSheetOpen ? "h-[60vh]" : "h-[90px]"
        }`}
      >
        <div
          onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)}
          className="px-6 h-[90px] flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Prévia (Itens Originais)
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                }).format(totalValue)}
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
                    {tx.date || "S/D"}
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
                  {typeof tx.value === "number"
                    ? tx.value.toFixed(2)
                    : tx.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {isBottomSheetOpen && (
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setView("review")}
              className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
              disabled={confirmedTransactions.length === 0}
            >
              <Receipt className="w-5 h-5" /> REVISAR & CATEGORIZAR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
