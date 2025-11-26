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
  FastForward
} from "lucide-react";

import { addMonths, parse, format, isValid } from "date-fns";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

// Backend Cloud Run
const API_URL =
  "https://finansmart-backend-119305932517.us-central1.run.app";

export default function InvoiceImportPage() {
  // =====================================
  // 🔐 AUTENTICAÇÃO
  // =====================================
  const { user } = useAuth();

  // =====================================
  // 💳 CARTÕES DE CRÉDITO (credit_cards)
  // =====================================
  const [creditCards, setCreditCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);

  // =====================================
  // STATES ORIGINAIS
  // =====================================
  const [view, setView] = useState("audit");
  const [file, setFile] = useState(null);

  const [visualData, setVisualData] = useState(null);
  const [confirmedTransactions, setConfirmedTransactions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [interactionMode, setInteractionMode] = useState("scroll");
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const [selectionBox, setSelectionBox] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [autoExpandInstallments, setAutoExpandInstallments] = useState(true);

  const [pageScales, setPageScales] = useState({});
  const startPos = useRef({ x: 0, y: 0 });
  const imageRefs = useRef({});
  const containerRef = useRef(null);

  // =========================================================
  // 🔗 CARREGAR CARTÕES DA TABELA credit_cards
  // =========================================================
  useEffect(() => {
    const fetchCards = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("credit_cards")
        .select("id, name, last_4_digits, account_id")
        .order("name", { ascending: true });

      if (!error) {
        setCreditCards(data);
        if (data.length > 0) setSelectedCardId(data[0].id);
      }
    };

    fetchCards();
  }, [user]);

  // =========================================================
  // 📤 UPLOAD DO PDF
  // =========================================================
  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedCardId) {
      alert("Selecione um cartão antes de importar a fatura!");
      return;
    }

    setLoading(true);
    setFile(selectedFile);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`${API_URL}/process_visual`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status} – ${text}`);
      }

      const data = await response.json();
      setVisualData(data.visual_data);
      setConfirmedTransactions([]);

    } catch (err) {
      alert("Erro ao processar: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // ✏️ LÓGICA DE DESENHO LIVRE (ORIGINAL TOTAL)
  // =========================================================
  const handlePointerDown = (e, pageNum) => {
    if (interactionMode === "scroll") return;

    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    startPos.current = { x: clientX, y: clientY };
    setIsDrawing(true);
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

    if (selectionBox && selectionBox.width > 10) {
      processManualSelection(selectionBox, selectionBox.page);
    }

    setSelectionBox(null);
  };

  // =========================================================
  // ✂️ PROCESSAR SELEÇÃO MANUAL
  // =========================================================
  const processManualSelection = async (box, pageNum) => {
    if (!visualData) return;

    setProcessing(true);

    try {
      const pageMeta = visualData.text_map.find((p) => p.page === pageNum);
      const scale = pageScales[pageNum];
      const imgRect = imageRefs.current[pageNum].getBoundingClientRect();

      const rel = {
        x0: (box.x - imgRect.left) / scale,
        top: (box.y - imgRect.top) / scale,
        x1: (box.x + box.width - imgRect.left) / scale,
        bottom: (box.y + box.height - imgRect.top) / scale
      };

      const selectedWords = pageMeta.words.filter((w) => {
        const cx = w.x0 + (w.x1 - w.x0) / 2;
        const cy = w.top + (w.bottom - w.top) / 2;
        return (
          cx >= rel.x0 &&
          cx <= rel.x1 &&
          cy >= rel.top &&
          cy <= rel.bottom
        );
      });

      const response = await fetch(`${API_URL}/parse_selection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: selectedWords })
      });

      const data = await response.json();
      addTransactions(data.transactions);

      setIsBottomSheetOpen(true);
      setInteractionMode("scroll");
    } catch (err) {
      console.error(err);
      alert("Erro ao interpretar texto.");
    } finally {
      setProcessing(false);
    }
  };

  // =========================================================
  // 🔁 PARCELAMENTO INTELIGENTE (ORIGINAL)
  // =========================================================
  const expandTransaction = (tx) => {
    if (!tx.installment || !autoExpandInstallments) return [tx];

    try {
      const [cur, tot] = tx.installment.split("/").map(Number);
      let baseDate = parse(tx.date, "dd/MM/yyyy", new Date());

      const list = [];
      for (let i = 1; i <= tot; i++) {
        const d = addMonths(baseDate, i - cur);

        list.push({
          ...tx,
          id: `${tx.id}_${i}`,
          date: format(d, "dd/MM/yyyy"),
          installment: `${i}/${tot}`
        });
      }
      return list;
    } catch {
      return [tx];
    }
  };

  const addTransactions = (list) => {
    let final = [];
    list.forEach((tx) => {
      if (tx.installment) final.push(...expandTransaction(tx));
      else final.push(tx);
    });
    setConfirmedTransactions((prev) => [...prev, ...final]);
  };

  // =========================================================
  // 💾 SALVAR NO SUPABASE (FINAL)
  // =========================================================
  const saveTransactions = async () => {
    if (!selectedCardId) {
      alert("Selecione um cartão antes de salvar.");
      return;
    }

    if (confirmedTransactions.length === 0) {
      alert("Nenhuma transação para salvar.");
      return;
    }

    const payload = confirmedTransactions.map((tx) => ({
      user_id: user.id,
      card_id: selectedCardId,
      description: tx.description,
      date: tx.date,
      installment: tx.installment || null,
      created_at: new Date().toISOString(),
      value: Number(
        tx.value
          .toString()
          .replace("R$", "")
          .replace(/\./g, "")
          .replace(",", ".")
      )
    }));

    const { error } = await supabase.from("transactions").insert(payload);

    if (error) {
      alert("Erro ao salvar: " + error.message);
      console.error(error);
      return;
    }

    alert("Transações importadas com sucesso!");

    // reset
    setConfirmedTransactions([]);
    setVisualData(null);
    setView("audit");
  };

  // =========================================================
  // 💰 TOTAL
  // =========================================================
  const totalValue = confirmedTransactions.reduce((acc, tx) => {
    const v = parseFloat(
      tx.value
        ?.toString()
        .replace("R$", "")
        .replace(".", "")
        .replace(",", ".")
    );
    return acc + (isNaN(v) ? 0 : v);
  }, 0);

  // =========================================================
  // ---------------------- RENDERIZAÇÃO ---------------------
  // =========================================================

  // ==========================
  // TELA 1 — IMPORT INICIAL
  // ==========================
  if (!visualData) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <Sparkles className="w-16 h-16 text-indigo-500 mx-auto" />

          <h1 className="text-3xl font-bold">Importador Inteligente</h1>

          {/* DROPDOWN CARTÕES */}
          <div className="text-left">
            <label className="block text-sm font-semibold mb-2">
              Cartão de crédito:
            </label>
            <select
              value={selectedCardId || ""}
              onChange={(e) => setSelectedCardId(e.target.value)}
              className="w-full p-3 rounded-xl border"
            >
              {creditCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name} •••• {card.last_4_digits}
                </option>
              ))}
            </select>
          </div>

          {/* CHECK DE PARCELAMENTO */}
          <label
            className="flex items-center gap-2 cursor-pointer select-none justify-center"
            onClick={() => setAutoExpandInstallments(!autoExpandInstallments)}
          >
            <div
              className={`w-5 h-5 border rounded flex items-center justify-center ${
                autoExpandInstallments ? "bg-indigo-600 text-white" : ""
              }`}
            >
              {autoExpandInstallments && <Check className="w-4 h-4" />}
            </div>
            Expandir parcelas automaticamente
          </label>

          {/* UPLOAD */}
          <label className="block cursor-pointer">
            <div className="py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" /> Enviar Fatura PDF
                </>
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

  // ==========================================
  // TELA 2 — REVIEW FINAL
  // ==========================================
  if (view === "review") {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="p-4 flex items-center justify-between border-b">
          <button onClick={() => setView("audit")}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Revisão da Importação</h1>
          <div></div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <h2 className="text-lg font-bold mb-4">
            Total: R$ {totalValue.toFixed(2)}
          </h2>

          {confirmedTransactions.map((tx) => (
            <div key={tx.id} className="border p-4 rounded-xl mb-3">
              <div className="flex gap-2">
                <input
                  value={tx.date}
                  onChange={(e) =>
                    setConfirmedTransactions((prev) =>
                      prev.map((t) =>
                        t.id === tx.id
                          ? { ...t, date: e.target.value }
                          : t
                      )
                    )
                  }
                  className="border p-2 rounded w-24"
                />
                <input
                  value={tx.description}
                  onChange={(e) =>
                    setConfirmedTransactions((prev) =>
                      prev.map((t) =>
                        t.id === tx.id
                          ? { ...t, description: e.target.value }
                          : t
                      )
                    )
                  }
                  className="border p-2 rounded flex-1"
                />
                <input
                  value={tx.value}
                  onChange={(e) =>
                    setConfirmedTransactions((prev) =>
                      prev.map((t) =>
                        t.id === tx.id
                          ? { ...t, value: e.target.value }
                          : t
                      )
                    )
                  }
                  className="border p-2 rounded w-28"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Botão de salvar */}
        <div className="p-4 border-t">
          <button
            onClick={saveTransactions}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold"
          >
            Confirmar Importação
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // TELA 3 — AUDIT (PDF + seleção livre)
  // ==========================================
  return (
    <div className="h-full flex flex-col relative">
      {/* Barra flutuante */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-white/90 p-2 rounded-full shadow-md">
        <button
          onClick={() => setInteractionMode("scroll")}
          className={`px-4 py-2 rounded-full ${
            interactionMode === "scroll"
              ? "bg-slate-800 text-white"
              : "bg-slate-100"
          }`}
        >
          <MousePointer2 className="w-4 h-4 inline mr-2" />
          Navegar
        </button>

        <button
          onClick={() => setInteractionMode("draw")}
          className={`px-4 py-2 rounded-full ${
            interactionMode === "draw"
              ? "bg-indigo-600 text-white"
              : "bg-slate-100"
          }`}
        >
          <Layers className="w-4 h-4 inline mr-2" />
          Selecionar
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-y-auto ${
          interactionMode === "draw" ? "cursor-crosshair" : ""
        }`}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="max-w-3xl mx-auto py-20 space-y-8">
          {visualData.images.map((img) => (
            <div
              key={img.page}
              onPointerDown={(e) => handlePointerDown(e, img.page)}
              className="relative"
            >
              <img
                ref={(el) => (imageRefs.current[img.page] = el)}
                src={img.base64}
                onLoad={() => {
                  const meta = visualData.text_map.find(
                    (p) => p.page === img.page
                  );
                  const scale =
                    imageRefs.current[img.page].offsetWidth / meta.width;
                  setPageScales((p) => ({ ...p, [img.page]: scale }));
                }}
                className="rounded-xl shadow-xl"
              />
            </div>
          ))}
        </div>

        {/* Caixa de seleção */}
        {selectionBox && (
          <div
            className="fixed border-2 border-indigo-600 bg-indigo-400/20 z-50"
            style={{
              left: selectionBox.x,
              top: selectionBox.y,
              width: selectionBox.width,
              height: selectionBox.height
            }}
          ></div>
        )}
      </div>

      {/* Bottom sheet */}
      <div
        className={`absolute bottom-0 w-full bg-white transition-all ${
          isBottomSheetOpen ? "h-[50vh]" : "h-[80px]"
        }`}
      >
        <div
          className="p-4 flex justify-between items-center cursor-pointer"
          onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)}
        >
          <h3 className="font-bold">Prévia</h3>
          {isBottomSheetOpen ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronUp className="w-5 h-5" />
          )}
        </div>

        {isBottomSheetOpen && (
          <div className="p-4 overflow-y-auto h-[80%]">
            {confirmedTransactions.map((tx) => (
              <div key={tx.id} className="py-2 border-b">
                <strong>{tx.date}</strong> — {tx.description} — R${" "}
                {tx.value}
              </div>
            ))}

            {confirmedTransactions.length > 0 && (
              <button
                onClick={() => setView("review")}
                className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl"
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
