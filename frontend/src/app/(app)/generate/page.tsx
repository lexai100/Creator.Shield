"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateDocument, connectWebSocket, getTemplates, type AnalysisResult, type WSMessage, type TemplateInfo } from "@/lib/api";
import { saveConversation, newId } from "@/lib/store";

export default function GeneratePage() {
  const router = useRouter();
  const [templates, setTemplates]     = useState<TemplateInfo[]>([]);
  const [selectedType, setSelectedType] = useState("FREELANCE");
  const [description, setDescription] = useState("");
  const [partyA, setPartyA]           = useState("");
  const [partyB, setPartyB]           = useState("");
  const [location, setLocation]       = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress]       = useState(0);
  const [statusText, setStatusText]   = useState("");
  const [result, setResult]           = useState<AnalysisResult | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [askCheck, setAskCheck]       = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const convId = useRef(newId("conv"));

  useEffect(() => {
    getTemplates().then(setTemplates).catch(() => {});
  }, []);

  const handleWS = useCallback((msg: WSMessage) => {
    if (msg.type === "round_update") {
      setProgress(msg.progress);
      setStatusText(`Drafting your contract… (${Math.round(msg.progress)}%)`);
    } else if (msg.type === "completed") {
      setResult(msg.result);
      setIsGenerating(false);
      setProgress(100);
      setStatusText("Done!");
      setAskCheck(true); // Prompt user to check the contract
      saveConversation({
        id: convId.current,
        title: `${selectedType} Contract`,
        type: "generate",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        starred: false,
        messageCount: 1,
      });
    } else if (msg.type === "error") {
      setError(msg.error ?? "Generation failed");
      setIsGenerating(false);
    }
  }, [selectedType]);

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setIsGenerating(true);
    setProgress(0);
    setResult(null);
    setError(null);
    setAskCheck(false);
    setStatusText("Starting contract generation…");
    convId.current = newId("conv");
    try {
      const { task_id } = await generateDocument({
        document_type: selectedType,
        description,
        party_a: partyA || undefined,
        party_b: partyB || undefined,
        location: location || undefined,
        run_adversarial: false, // Just generate, no adversarial rounds
      });
      wsRef.current = connectWebSocket(task_id, handleWS, () => {
        setError("Connection lost. Please try again.");
        setIsGenerating(false);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!result?.final_document) return;
    const blob = new Blob([result.final_document], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `CreatorShield_Contract_${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCheckIt = () => {
    // Pass the generated contract to the Check page via sessionStorage
    if (result?.final_document) {
      sessionStorage.setItem("cs_prefill_contract", result.final_document);
      router.push("/check");
    }
  };

  const handleReset = () => {
    setResult(null); setError(null); setAskCheck(false);
    setProgress(0); setDescription(""); setPartyA(""); setPartyB(""); setLocation("");
    convId.current = newId("conv");
  };

  const FALLBACK_TYPES = [
    { value: "FREELANCE",    label: "Freelance / Service Contract" },
    { value: "BRAND_DEAL",  label: "Brand Deal / Influencer Agreement" },
    { value: "NDA",          label: "Non-Disclosure Agreement" },
    { value: "EMPLOYMENT",  label: "Employment Contract" },
    { value: "RENT_AGREEMENT", label: "Rental Agreement (11-month)" },
    { value: "PARTNERSHIP", label: "Partnership Deed" },
    { value: "MOU",          label: "Memorandum of Understanding" },
    { value: "SALE",         label: "Sale Agreement" },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 860, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.8rem", fontWeight: 900, margin: 0 }}>✍️ Write a Contract</h1>
        <p style={{ color: "var(--color-lexai-text-muted)", marginTop: 6, fontSize: "0.9rem" }}>
          Tell us what you need — the AI drafts a formal, legally-sound contract in seconds.
        </p>
      </div>

      {/* ── Form ── */}
      {!isGenerating && !result && (
        <div className="glass-card" style={{ padding: "28px 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-lexai-text-muted)", display: "block", marginBottom: 8 }}>Contract Type</label>
              <select className="lexai-input" value={selectedType} onChange={e => setSelectedType(e.target.value)}>
                {(templates.length > 0 ? templates.map(t => ({ value: t.document_type, label: t.title })) : FALLBACK_TYPES)
                  .map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-lexai-text-muted)", display: "block", marginBottom: 8 }}>Location / Jurisdiction</label>
              <input className="lexai-input" placeholder="e.g. Mumbai, Maharashtra" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-lexai-text-muted)", display: "block", marginBottom: 8 }}>First Party (You / Your Company)</label>
              <input className="lexai-input" placeholder="e.g. Ananya Singh" value={partyA} onChange={e => setPartyA(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-lexai-text-muted)", display: "block", marginBottom: 8 }}>Second Party (Client / Brand)</label>
              <input className="lexai-input" placeholder="e.g. BrandX India Pvt Ltd" value={partyB} onChange={e => setPartyB(e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-lexai-text-muted)", display: "block", marginBottom: 8 }}>
              Describe What You Need <span style={{ color: "var(--color-lexai-danger)" }}>*</span>
            </label>
            <textarea
              className="lexai-textarea"
              placeholder={`e.g. I'm an Instagram influencer with 200k followers. BrandX wants me to post 3 reels and 5 stories over one month promoting their skincare product. Payment is ₹80,000. They want a 30-day exclusivity on skincare brands. I need strong protection on payment terms and content rights.`}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={6}
              style={{ marginBottom: 0 }}
            />
            <p style={{ fontSize: "0.72rem", color: "var(--color-lexai-text-muted)", marginTop: 6, lineHeight: 1.5 }}>
              💡 The more detail you give, the better the contract. Include payment amount, timeline, deliverables, and any special requirements.
            </p>
          </div>

          <button onClick={handleGenerate} disabled={!description.trim()} className="btn-primary"
            style={{ width: "100%", padding: "14px", fontSize: "1rem", opacity: !description.trim() ? 0.4 : 1 }}>
            ✍️ Generate My Contract
          </button>
        </div>
      )}

      {/* ── Generating ── */}
      {isGenerating && (
        <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", border: "3px solid var(--color-lexai-accent)", borderTopColor: "transparent", animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.3rem", fontWeight: 800, marginBottom: 8 }}>Drafting your contract…</h3>
          <p style={{ color: "var(--color-lexai-text-muted)", marginBottom: 20, fontSize: "0.88rem" }}>{statusText}</p>
          <div className="progress-bar" style={{ maxWidth: 360, margin: "0 auto" }}>
            <div className="progress-fill" style={{ width: `${progress || 30}%` }} />
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <p style={{ color: "var(--color-lexai-danger)", fontWeight: 700, marginBottom: 6 }}>Generation Failed</p>
          <p style={{ fontSize: "0.85rem", color: "var(--color-lexai-text-muted)" }}>{error}</p>
          <button className="btn-secondary" style={{ marginTop: 12 }} onClick={() => { setError(null); handleReset(); }}>← Try Again</button>
        </div>
      )}

      {/* ── Result ── */}
      {result && !isGenerating && (
        <div>
          {/* Back button */}
          <button onClick={handleReset} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20, padding: "8px 16px", borderRadius: 10, border: "1px solid var(--color-lexai-border)", background: "transparent", color: "var(--color-lexai-text-muted)", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-lexai-accent)"; (e.currentTarget as HTMLElement).style.color = "var(--color-lexai-text)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-lexai-border)"; (e.currentTarget as HTMLElement).style.color = "var(--color-lexai-text-muted)"; }}>
            ← Write Another
          </button>

          {/* Ask to check banner */}
          {askCheck && (
            <div style={{
              background: "rgba(212,130,26,0.08)", border: "1px solid rgba(212,130,26,0.3)",
              borderRadius: 16, padding: "18px 22px", marginBottom: 20,
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14,
            }}>
              <div>
                <p style={{ fontWeight: 700, margin: "0 0 4px" }}>🛡️ Want to check this contract for issues?</p>
                <p style={{ fontSize: "0.82rem", color: "var(--color-lexai-text-muted)", margin: 0, lineHeight: 1.5 }}>
                  Our AI can review the generated contract and fix any weaknesses before you use it.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setAskCheck(false)} className="btn-secondary" style={{ fontSize: "0.82rem" }}>No thanks</button>
                <button onClick={handleCheckIt} className="btn-primary" style={{ fontSize: "0.82rem" }}>Yes, Check It →</button>
              </div>
            </div>
          )}

          {/* Contract display */}
          <div style={{ background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", borderBottom: "1px solid var(--color-lexai-border)" }}>
              <div>
                <p style={{ fontWeight: 700, margin: 0 }}>✅ Contract Generated</p>
                <p style={{ fontSize: "0.75rem", color: "var(--color-lexai-text-muted)", margin: 0, marginTop: 2 }}>Review carefully before using</p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-secondary" style={{ fontSize: "0.8rem" }} onClick={handleCheckIt}>🛡️ Check for Issues</button>
                <button className="btn-secondary" style={{ fontSize: "0.8rem" }} onClick={handleDownload}>⬇️ Download</button>
              </div>
            </div>
            <div style={{ padding: 24, maxHeight: 600, overflowY: "auto" }}>
              <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", lineHeight: 1.8, whiteSpace: "pre-wrap", color: "var(--color-lexai-text)", margin: 0 }}>
                {result.final_document}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
