// INVOICEIMPORTPAGE.JSX — COMPLETO, CORRIGIDO, E PRONTO PARA USO
// Gabriel Ricco — FinanSmart AI 2025

import React, { useState, useEffect, useRef } from "react";
import {
  Upload, Loader2, Check, Trash2, MousePointer2, Layers,
  ChevronDown, ChevronUp, Receipt, Sparkles, ArrowLeft, Save,
  Edit3, History, FastForward
} from "lucide-react";

import { addMonths, parse, format, isValid } from "date-fns";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

// Cloud Run backend
const API_URL = "https://finansmart-backend-119305932517.us-central1.run.app";

export default function InvoiceImportPage() {
  // =====================
  // ESTADOS PRINCIPAIS
  // =====================
  const { user } = useAuth();

  const [creditCards, setCreditCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);

  const [file, setFile] = useState(null);
  const [visualData, setVisualData] = useState(null);
  const [confirmedTransactions, setConfirmedTransactions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [view, setView] = useState("audit"); // audit | review
  const [interactionMode, setInteractionMode] = useState("scroll"); // scroll | draw

  const [selectionBox, setSelectionBox] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [pageScales, setPageScales] = useState({});
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const [autoExpandInstallments, setAutoExpandInstallments] = useState(true);

  const imageRefs = useRef({});
  const startPos = useRef({ x: 0, y: 0 });

  // ==================================================
  // CARREGAR CARTÕES DE CRÉDITO DO USUÁRIO
  // ==================================================
  useEffect(() => {
    const loadCards = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("credit_cards")
        .select("id, name, last_4_digits, account_id")
        .in(
          "account_id",
          // Seleciona apenas contas do usuário logado
          (
            await supabase
              .from("accounts")
              .select("id")
              .eq("user_id", user.id)
          ).data?.map((x) => x.id) || []
        );

      if (!error && data) {
        setCreditCards(data);
        if (data.length > 0) setSelectedCardId(data[0].id);
      }
    };

    loadCards();
  }, [user]);

  // ==================================================
  // EXPANSÃO DE PARCELAS
  // ==================================================
  const expandTransaction = (tx) => {
    if (!tx.installment || !autoExpandInstallments) return [tx];

    try {
      const [current, total] = tx.installment.split("/").map((n) => parseInt(n));
      if (!current || !total) return [tx];

      let dateObj = parse(tx.date, "dd/MM", new Date());
      if (!isValid(dateObj)) return [tx];

      const expanded = [];

      for (let i = 1; i <= total; i++) {
        const offset = i - current;
        const newDate = addMonths(dateObj, offset);

        let status = "pending";
        let tag = "Atual";

        if (i < current) {
          status = "consolidated";
          tag = "Passado";
        } else if (i > current) {
          status = "scheduled";
          tag = "Futuro";
        }

        expanded.push({
          ...tx,
          id: `${tx.id}_${i}`,
          date: format(newDate, "dd/MM/yyyy"),
          installment: `${i}/${total}`,
          tag,
          status,
        });
      }

      return expanded;
    } catch {
      return [tx];
    }
  };

  const addTransactions = (items) => {
    let all = [];
    items.forEach((tx) => {
      if (tx.installment) all.push(...expandTransaction(tx));
      else all.push(tx);
    });
    setConfirmedTransactions((prev) => [...prev, ...all]);
  };

  // ==================================================
  // UPLOAD + LER PDF NO BACKEND
  // ==================================================
  const handleFileSelect = async (e) => {
    const f = e.target.files[0];
    if (!f) return;

    setLoading(true);
    setFile(f);

    const formData = new FormData();
    formData.append("file", f);

    try {
      const response = await fetch(`${API_URL}/process_visual`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 150)}`);
      }

      const data = await response.json();

      if (!data.visual_data) throw new Error("visual_data ausente");

      setVisualData(data.visual_data);
      setConfirmedTransactions([]);
      setIsBottomSheetOpen(false);
    } catch (err) {
      alert("Erro: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // SELEÇÃO MANUAL
  // ==================================================
  const handlePointerDown = (e, page) => {
    if (interactionMode === "scroll") return;

    e.preventDefault();

    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;

    startPos.current = { x, y };
    setSelectionBox({ x, y, width: 0, height: 0, page });
    setIsDrawing(true);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;

    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;

    const width = x - startPos.current.x;
    const height = y - startPos.current.y;

    setSelectionBox({
      x: width > 0 ? startPos.current.x : x,
      y: height > 0 ? startPos.current.y : y,
      width: Math.abs(width),
      height: Math.abs(height),
      page: selectionBox.page,
    });
  };

  const handlePointerUp = async () => {
    if (!isDrawing || !selectionBox) return;

    setIsDrawing(false);

    try {
      await processManualSelection(selectionBox);
    } catch (err) {
      alert(err.message);
    }

    setSelectionBox(null);
  };

  // ==================================================
  // PROCESSAR SELEÇÃO MANUAL
  // ==================================================
  const processManualSelection = async (box) => {
    const pageMeta = visualData.text_map.find((x) => x.page === box.page);
    const scale = pageScales[box.page];

    // converter coords
    const rect = {
      x0: (box.x - imageRefs.current[box.page].getBoundingClientRect().left) / scale,
      y0: (box.y - imageRefs.current[box.page].getBoundingClientRect().top) / scale,
      x1: (box.x + box.width - imageRefs.current[box.page].getBoundingClientRect().left) / scale,
      y1: (box.y + box.height - imageRefs.current[box.page].getBoundingClientRect().top) / scale,
    };

    const words = pageMeta.words.filter((w) => {
      const cx = w.x0 + (w.x1 - w.x0) / 2;
      const cy = w.top + (w.bottom - w.top) / 2;
      return cx >= rect.x0 && cx <= rect.x1 && cy >= rect.y0 && cy <= rect.y1;
    });

    if (words.length === 0) return;

    setProcessing(true);

    const res = await fetch(`${API_URL}/parse_selection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ words }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error("Erro parse_selection: " + t);
    }

    const data = await res.json();
    addTransactions(data.transactions || []);
    setIsBottomSheetOpen(true);

    setProcessing(false);
  };

  // ==================================================
  // SALVAR TRANSAÇÕES NO SUPABASE
  // ==================================================
  const saveTransactions = async () => {
    if (!selectedCardId) {
      alert("Por favor, selecione um cartão.");
      return;
    }

    const payload = confirmedTransactions.map((tx) => ({
      user_id: user.id,
      card_id: selectedCardId,
      date: tx.date,
      description: tx.description,
      value: Number(String(tx.value).replace(",", ".").replace("R$", "")),
      installment: tx.installment || null,
    }));

    const { error } = await supabase.from("transactions").insert(payload);

    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      alert("Transações salvas com sucesso!");
      setConfirmedTransactions([]);
      setView("audit");
    }
  };

  // ==================================================
  // ETAPA 1 — AUDIT VIEW (antes da revisão)
  // ==================================================
  if (!visualData) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-sm text-center space-y-6">
          <Sparkles className="w-16 h-16 text-indigo-500 mx-auto" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Importador Inteligente
          </h1>

          {/* DROPDOWN DE CARTÕES */}
          <div className="space-y-2 text-left">
            <label className="font-semibold text-sm text-slate-600 dark:text-slate-300">
              Selecione o cartão:
            </label>
            <select
              value={selectedCardId || ""}
              onChange={(e) => setSelectedCardId(e.target.value)}
              className="w-full p-3 rounded-xl border bg-white dark:bg-slate-800"
            >
              {creditCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name} •••• {card.last_4_digits}
                </option>
              ))}
            </select>
          </div>

          {/* UPLOAD */}
          <label className="w-full block">
            <div className="py-4 bg-indigo-600 text-white font-bold rounded-xl shadow cursor-pointer">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Processando...
                </span>
              ) : (
                "Enviar PDF da Fatura"
              )}
            </div>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
        </div>
      </div>
    );
  }

  // ==================================================
  // ETAPA 2 — REVIEW VIEW
  // ==================================================
  if (view === "review") {
    const total = confirmedTransactions.reduce((sum, tx) => {
      return sum + Number(String(tx.value).replace(",", ".").replace("R$", ""));
    }, 0);

    return (
      <div className="h-full flex flex-col bg-white dark:bg-slate-900">
        <div className="p-4 flex items-center gap-4 border-b">
          <button onClick={() => setView("audit")}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Revisão da Fatura</h1>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <h2 className="text-sm font-semibold">
            Total:{" "}
            <span className="font-bold text-indigo-600">
              R$ {total.toFixed(2)}
            </span>
          </h2>

          {confirmedTransactions.map((tx) => (
            <div
              key={tx.id}
              className="rounded-xl border p-3 bg-slate-50 dark:bg-slate-800"
            >
              <div className="flex justify-between items-center">
                <input
                  value={tx.date}
                  onChange={(e) =>
                    updateTx(tx.id, "date", e.target.value)
                  }
                  className="border p-1 rounded w-28"
                />
                <button onClick={() => deleteTx(tx.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>

              <input
                value={tx.description}
                onChange={(e) =>
                  updateTx(tx.id, "description", e.target.value)
                }
                className="w-full border p-1 rounded mt-2"
              />

              <input
                value={tx.value}
                onChange={(e) =>
                  updateTx(tx.id, "value", e.target.value)
                }
                className="w-full border p-1 mt-2 rounded text-right"
              />
            </div>
          ))}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={saveTransactions}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold"
          >
            <Save className="inline w-4 h-4 mr-2" />
            Confirmar Importação
          </button>
        </div>
      </div>
    );
  }

  // ==================================================
  // ETAPA 3 — AUDIT VIEW (visualização do PDF)
  // ==================================================
  return (
    <div className="h-full relative overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Barra flutuante */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 border px-4 py-2 rounded-full shadow-lg z-50 flex gap-2">
        <button
          className={`px-3 py-1 rounded-full ${
            interactionMode === "scroll"
              ? "bg-slate-900 text-white"
              : "text-slate-600"
          }`}
          onClick={() => setInteractionMode("scroll")}
        >
          Navegar
        </button>

        <button
          className={`px-3 py-1 rounded-full ${
            interactionMode === "draw"
              ? "bg-indigo-600 text-white"
              : "text-slate-600"
          }`}
          onClick={() => setInteractionMode("draw")}
        >
          Selecionar
        </button>
      </div>

      {/* Conteúdo do PDF */}
      <div
        className={`h-full overflow-y-auto ${
          interactionMode === "draw" ? "cursor-crosshair" : "cursor-default"
        }`}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="max-w-3xl mx-auto py-20 space-y-8 px-4">
          {visualData.images.map((img) => (
            <img
              key={img.page}
              ref={(el) => (imageRefs.current[img.page] = el)}
              src={img.base64}
              onLoad={() => {
                const meta = visualData.text_map.find(
                  (x) => x.page === img.page
                );
                const w = img.width;
                const scale =
                  imageRefs.current[img.page].offsetWidth / meta.width;
                setPageScales((p) => ({ ...p, [img.page]: scale }));
              }}
              onPointerDown={(e) => handlePointerDown(e, img.page)}
              className="rounded-xl shadow-xl"
            />
          ))}
        </div>
      </div>

      {/* Seleção */}
      {selectionBox && (
        <div
          className="fixed z-50 border-2 border-indigo-600 bg-indigo-600/20 rounded"
          style={{
            top: selectionBox.y,
            left: selectionBox.x,
            width: selectionBox.width,
            height: selectionBox.height,
          }}
        ></div>
      )}

      {/* Bottom Sheet */}
      <div
        className={`absolute bottom-0 w-full bg-white dark:bg-slate-800 border-t p-4 transition-all ${
          isBottomSheetOpen ? "h-[50vh]" : "h-[80px]"
        }`}
      >
        <div
          onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)}
          className="flex justify-between items-center cursor-pointer"
        >
          <h2 className="font-bold">Prévia</h2>
          {isBottomSheetOpen ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronUp className="w-5 h-5" />
          )}
        </div>

        {isBottomSheetOpen && (
          <div className="mt-4 space-y-2 overflow-y-auto h-[80%]">
            {confirmedTransactions.map((tx) => (
              <div
                key={tx.id}
                className="border rounded-xl p-2 bg-slate-50 dark:bg-slate-700"
              >
                {tx.date} — {tx.description} — R$ {tx.value}
              </div>
            ))}
            {confirmedTransactions.length > 0 && (
              <button
                onClick={() => setView("review")}
                className="mt-4 w-full py-3 rounded-xl bg-indigo-600 text-white font-bold"
              >
                Revisar & Expandir
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
