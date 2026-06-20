"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  analyzeDocument, connectWebSocket, searchKanoonForType,
  type AnalysisResult, type AdversarialRound, type WSMessage,
  type Vulnerability, type KanoonResult,
} from "@/lib/api";
import VoiceInterface from "@/components/VoiceInterface";
import ComplianceRadar from "@/components/ComplianceRadar";
import LoopholeNetwork from "@/components/LoopholeNetwork";
import NegotiateTab from "@/components/NegotiateTab";
import { saveConversation, saveContractResult, newId } from "@/lib/db";
import { usePageState } from "@/hooks/usePageState";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getScoreColor(s: number) { return s >= 70 ? "#ef4444" : s >= 40 ? "#f59e0b" : "#22c55e"; }
function getSeverityColor(sev: string) {
  return sev === "CRITICAL" ? "#ef4444" : sev === "HIGH" ? "#f97316" : sev === "MEDIUM" ? "#eab308" : "#34d399";
}

type ResultTab = "overview" | "vulns" | "document" | "rounds" | "caselaw" | "negotiate";

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CheckPage() {
  // ── Persisted state (survives refresh + navigation) ────────────────────────
  const [ps, setPs, clearPs] = usePageState("check", {
    textInput: "",
    result: null as AnalysisResult | null,
    rounds: [] as AdversarialRound[],
    activeTab: "overview" as ResultTab,
    convId: newId("conv"),
    fileName: "",
  });

  // Convenience aliases
  const textInput   = ps.textInput;
  const result      = ps.result;
  const rounds      = ps.rounds;
  const activeTab   = ps.activeTab;
  const convId      = useRef(ps.convId);

  // ── Transient state (ok to reset on refresh) ──────────────────────────────
  const [file, setFile]               = useState<File | null>(null);
  const [isDragging, setIsDragging]   = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress]       = useState(result ? 100 : 0);
  const [currentRound, setCurrentRound] = useState(0);
  const [statusText, setStatusText]   = useState(result ? "Analysis complete!" : "");
  const [error, setError]             = useState<string | null>(null);
  const [kanoonResults, setKanoonResults] = useState<KanoonResult[]>([]);
  const [kanoonLoading, setKanoonLoading] = useState(false);
  const [kanoonCourt, setKanoonCourt] = useState("");
  const [ttsText, setTtsText]         = useState<string | undefined>(undefined);
  const wsRef    = useRef<WebSocket | null>(null);
  const fileRef  = useRef<HTMLInputElement>(null);

  // Pre-fill from generate page "Check It" button
  useEffect(() => {
    const prefill = sessionStorage.getItem("cs_prefill_contract");
    if (prefill) {
      setPs({ textInput: prefill, result: null, rounds: [], convId: newId("conv") });
      sessionStorage.removeItem("cs_prefill_contract");
    }
  }, []);

  // ── WebSocket handler ─────────────────────────────────────────────────────

  const handleWS = useCallback((msg: WSMessage) => {
    if (msg.type === "round_update") {
      setProgress(msg.progress);
      setCurrentRound(msg.round.round_number);
      setPs({ rounds: [...(ps.rounds ?? []), msg.round] });
      setStatusText(`Round ${msg.round.round_number}: ${msg.round.vulnerabilities_found} problems spotted (Score: ${msg.round.score})`);
    } else if (msg.type === "completed") {
      setPs({ result: msg.result });
      setIsProcessing(false);
      setProgress(100);
      setStatusText("Analysis complete!");
      setTtsText(
        `Analysis complete. Risk score: ${msg.result.risk_score} out of 100. ` +
        (msg.result.risk_score < 15 ? "Your contract looks safe." :
         msg.result.risk_score < 40 ? "A few issues were found. Review them carefully." :
         "Significant issues found. Get legal advice before signing.")
      );
      // Save to Supabase
      saveConversation({
        id: convId.current, title: ps.fileName || "Contract Check",
        type: "check", createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(), starred: false, messageCount: 1,
      });
      saveContractResult({
        taskId: convId.current,
        filename: ps.fileName || "contract",
        analysis: msg.result,
      });
      fetchCaseLaw("creator contract");
    } else if (msg.type === "error") {
      const raw = msg.error ?? "Unknown error";
      const friendly = raw.includes("429") || raw.toLowerCase().includes("too many")
        ? "The AI is handling too many requests right now. Wait 30 seconds and try again."
        : raw.includes("timeout") ? "Analysis timed out. Try a shorter document."
        : raw.length > 200 ? raw.slice(0, 200) + "…" : raw;
      setError(friendly);
      setIsProcessing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ps.fileName]);

  // ── Fetch case law ────────────────────────────────────────────────────────

  const fetchCaseLaw = useCallback(async (docType: string, court = kanoonCourt) => {
    setKanoonLoading(true);
    try {
      const res = await searchKanoonForType(docType, court);
      setKanoonResults(res.results);
    } catch { setKanoonResults([]); }
    finally { setKanoonLoading(false); }
  }, [kanoonCourt]);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!file && !textInput.trim()) return;
    setIsProcessing(true);
    setProgress(0);
    setCurrentRound(0);
    setPs({ rounds: [], result: null });
    setError(null);
    setStatusText("Starting your contract check…");
    try {
      const { task_id } = await analyzeDocument(file || undefined, textInput || undefined);
      wsRef.current = connectWebSocket(task_id, handleWS, () => {
        setError("Connection lost. Please try again.");
        setIsProcessing(false);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start analysis");
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPs({ textInput: "", result: null, rounds: [], convId: newId("conv"), fileName: "" });
    setError(null); setProgress(0); setCurrentRound(0);
    convId.current = newId("conv");
  };

  const handleDownload = () => {
    if (!result?.final_document) return;
    const blob = new Blob([result.final_document], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CreatorShield_Fixed_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Compute summary stats ────────────────────────────────────────────────

  const allVulns = result ? result.rounds.flatMap(r => r.vulnerabilities ?? []) : [];
  const uniqueVulns: Vulnerability[] = [];
  const seen = new Set<string>();
  for (const v of allVulns) {
    const key = v.name + v.affected_clause;
    if (!seen.has(key)) { seen.add(key); uniqueVulns.push(v); }
  }
  const critCount = uniqueVulns.filter(v => v.severity === "CRITICAL").length;
  const highCount = uniqueVulns.filter(v => v.severity === "HIGH").length;

  const RESULT_TABS: { key: ResultTab; label: string }[] = [
    { key: "overview",  label: "📋 Summary" },
    { key: "vulns",     label: "🐛 Problems Found" },
    { key: "document",  label: "📝 Fixed Contract" },
    { key: "rounds",    label: "🔁 Review Process" },
    { key: "caselaw",   label: "⚖️ Relevant Cases" },
    { key: "negotiate", label: "📧 Suggest Changes" },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.8rem", fontWeight: 900, margin: 0 }}>
          🛡️ Check My Contract
        </h1>
        <p style={{ color: "var(--color-lexai-text-muted)", marginTop: 6, fontSize: "0.9rem" }}>
          Two AI agents review your contract — one finds problems, one fixes them. Upload your document to get started.
        </p>
      </div>

      {/* ── Input form ── */}
      {!isProcessing && !result && (
        <div className="glass-card" style={{ padding: "28px 32px" }}>
          {/* Drop zone */}
          <div
            className={`drop-zone mb-6 ${isDragging ? "active" : ""}`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setPs({ fileName: f.name }); } }}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx" className="hidden"
              onChange={e => { const f = e.target.files?.[0] || null; setFile(f); if (f) setPs({ fileName: f.name }); }} />
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📂</div>
            {file ? (
              <div>
                <p style={{ fontWeight: 700, fontSize: "1rem" }}>{file.name}</p>
                <p style={{ fontSize: "0.82rem", color: "var(--color-lexai-text-muted)" }}>{(file.size / 1024).toFixed(1)} KB</p>
                <button onClick={e => { e.stopPropagation(); setFile(null); }}
                  style={{ marginTop: 8, fontSize: "0.75rem", color: "var(--color-lexai-danger)", background: "none", border: "none", cursor: "pointer" }}>
                  ✕ Remove
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontWeight: 600, fontSize: "1rem", marginBottom: 4 }}>Drop your contract here</p>
                <p style={{ fontSize: "0.82rem", color: "var(--color-lexai-text-muted)" }}>PDF, TXT or DOCX — or click to browse</p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ position: "relative", textAlign: "center", marginBottom: 20 }}>
            <div style={{ height: 1, background: "var(--color-lexai-border)" }} />
            <span style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "var(--color-lexai-surface)", padding: "0 14px", color: "var(--color-lexai-text-muted)", fontSize: "0.8rem" }}>or paste text</span>
          </div>

          <textarea className="lexai-textarea" style={{ marginBottom: 20 }}
            placeholder="Paste your contract text here…" value={textInput}
            onChange={e => setPs({ textInput: e.target.value })} rows={7} />

          {/* Voice */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: "0.72rem", color: "var(--color-lexai-text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>🎙️ Or speak your document</p>
            <VoiceInterface
              onTranscript={text => setPs({ textInput: ps.textInput ? `${ps.textInput}\n${text}` : text })}
              textToSpeak={ttsText}
              placeholder="Speak your contract text…"
            />
          </div>

          <button onClick={handleAnalyze} disabled={!file && !textInput.trim()} className="btn-primary"
            style={{ width: "100%", padding: "14px", fontSize: "1rem", opacity: !file && !textInput.trim() ? 0.4 : 1 }}>
            🛡️ Check My Contract
          </button>
        </div>
      )}

      {/* ── Processing ── */}
      {isProcessing && (
        <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ width: 70, height: 70, borderRadius: "50%", border: "3px solid var(--color-lexai-accent)", borderTopColor: "transparent", animation: "spin 1s linear infinite", margin: "0 auto 24px" }} />
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.4rem", fontWeight: 800, marginBottom: 8 }}>
            {currentRound > 0 ? <>Review Round <span style={{ color: "var(--color-lexai-accent)" }}>{currentRound}</span> / 3</> : "Starting your contract check…"}
          </h3>
          <p style={{ color: "var(--color-lexai-text-muted)", marginBottom: 24, fontSize: "0.88rem" }}>{statusText}</p>
          <div className="progress-bar" style={{ maxWidth: 400, margin: "0 auto 8px" }}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--color-lexai-text-muted)" }}>{progress}% complete</p>
          {rounds.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420, margin: "20px auto 0" }}>
              {rounds.map(r => (
                <div key={r.round_number} style={{ background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontWeight: 700, fontSize: "0.85rem", margin: 0 }}>Round {r.round_number}</p>
                    <p style={{ fontSize: "0.72rem", color: "var(--color-lexai-text-muted)", margin: 0 }}>{r.vulnerabilities_found} problems spotted</p>
                  </div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 900, color: getScoreColor(r.score) }}>{r.score}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <p style={{ color: "var(--color-lexai-danger)", fontWeight: 700, marginBottom: 6 }}>Analysis Failed</p>
          <p style={{ color: "var(--color-lexai-text-muted)", fontSize: "0.85rem" }}>{error}</p>
          <button className="btn-secondary" style={{ marginTop: 14 }} onClick={() => { setError(null); handleReset(); }}>← Try Again</button>
        </div>
      )}

      {/* ── Results ── */}
      {result && !isProcessing && (
        <div>
          {/* Back button */}
          <button onClick={handleReset} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20, padding: "8px 16px", borderRadius: 10, border: "1px solid var(--color-lexai-border)", background: "transparent", color: "var(--color-lexai-text-muted)", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-lexai-accent)"; (e.currentTarget as HTMLElement).style.color = "var(--color-lexai-text)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-lexai-border)"; (e.currentTarget as HTMLElement).style.color = "var(--color-lexai-text-muted)"; }}>
            ← Check Another Contract
          </button>

          {/* Score hero */}
          <div className="glass-card glow-accent" style={{ padding: 28, textAlign: "center", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 40, marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: "0.8rem", color: "var(--color-lexai-text-muted)", marginBottom: 4 }}>Before</p>
                <div style={{ fontSize: "2.8rem", fontWeight: 900, color: getScoreColor(result.rounds[0]?.score ?? result.risk_score) }}>
                  {result.rounds[0]?.score ?? result.risk_score}
                </div>
              </div>
              <div style={{ fontSize: "2rem", color: "var(--color-lexai-accent)", alignSelf: "center" }}>→</div>
              <div>
                <p style={{ fontSize: "0.8rem", color: "var(--color-lexai-text-muted)", marginBottom: 4 }}>After (Best)</p>
                <div style={{ fontSize: "3.5rem", fontWeight: 900, color: getScoreColor(result.risk_score) }}>
                  {result.risk_score}
                </div>
              </div>
            </div>
            <p style={{ color: "var(--color-lexai-text-muted)", fontSize: "0.88rem" }}>
              Checked across <strong style={{ color: "var(--color-lexai-text)" }}>{result.rounds.length}</strong> review rounds
              {result.pii_entities_found > 0 && <> · 🔒 {result.pii_entities_found} personal details protected</>}
            </p>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: "1px solid var(--color-lexai-border)", paddingBottom: 6, flexWrap: "wrap" }}>
            {RESULT_TABS.map(t => (
              <button key={t.key} onClick={() => setPs({ activeTab: t.key })}
                style={{
                  padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: activeTab === t.key ? 700 : 500,
                  background: activeTab === t.key ? "var(--color-lexai-accent)" : "transparent",
                  color: activeTab === t.key ? "#0d0b08" : "var(--color-lexai-text-muted)",
                  transition: "all 0.2s",
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Overview tab ── */}
          {activeTab === "overview" && (
            <div>
              <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>📋 Summary of Findings</h3>
                {(() => {
                  const initScore = result.rounds[0]?.score ?? result.risk_score;
                  const finalScore = result.risk_score;
                  const improvement = initScore - finalScore;
                  const totalVulns = result.rounds.reduce((a, r) => a + r.vulnerabilities_found, 0);
                  const totalPatches = result.rounds.reduce((a, r) => a + r.patches_applied, 0);
                  const riskLabel = finalScore < 15 ? "✅ LOW — Safe to use"
                    : finalScore < 30 ? "⚠️ MODERATE — Review before signing"
                    : finalScore < 50 ? "🔶 ELEVATED — Significant issues"
                    : finalScore < 70 ? "🔴 HIGH — Substantial risks"
                    : "🚨 CRITICAL — Do NOT sign without legal advice";
                  const points = [
                    { icon: "📉", label: "Overall Improvement", value: improvement > 0 ? `Risk dropped by ${improvement} pts (${initScore} → ${finalScore})` : `Risk score: ${finalScore}/100` },
                    { icon: "🐛", label: "Total Issues Spotted", value: `${totalVulns} contract issues identified` },
                    { icon: "🛡️", label: "Changes Made", value: `${totalPatches} clauses improved by the AI` },
                    ...(critCount > 0 ? [{ icon: "💀", label: "Critical Issues", value: `${critCount} critical problems — must fix before signing` }] : []),
                    ...(highCount > 0 ? [{ icon: "🔴", label: "Serious Issues", value: `${highCount} serious problems found` }] : []),
                    { icon: "⚖️", label: "Overall Risk Level", value: riskLabel },
                    ...(result.pii_entities_found > 0 ? [{ icon: "🔒", label: "Privacy Protection", value: `${result.pii_entities_found} personal details hidden` }] : []),
                  ];
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {points.map((p, i) => (
                        <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 14px", background: "var(--color-lexai-surface)", borderRadius: 10 }}>
                          <span style={{ fontSize: "1rem", flexShrink: 0 }}>{p.icon}</span>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: "0.8rem", margin: 0 }}>{p.label}</p>
                            <p style={{ fontSize: "0.82rem", color: "var(--color-lexai-text-muted)", margin: 0, lineHeight: 1.5 }}>{p.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              {result.radar && (
                <div className="glass-card" style={{ padding: 24 }}>
                  <h3 style={{ fontWeight: 700, marginBottom: 16 }}>📊 Contract Strengths Overview</h3>
                  <ComplianceRadar scores={result.radar as unknown as Record<string, number>} />
                </div>
              )}
            </div>
          )}

          {/* ── Problems tab ── */}
          {activeTab === "vulns" && (
            <div>
              <h3 style={{ fontWeight: 700, marginBottom: 16 }}>🐛 Problems Found ({uniqueVulns.length})</h3>
              {uniqueVulns.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 16 }}>
                  <div style={{ fontSize: "3rem", marginBottom: 12 }}>✅</div>
                  <p style={{ fontWeight: 700, color: "var(--color-lexai-success)", fontSize: "1.1rem" }}>No Problems Found!</p>
                  <p style={{ color: "var(--color-lexai-text-muted)", fontSize: "0.85rem", marginTop: 6 }}>Your contract passed all our checks — great news!</p>
                </div>
              ) : (
                <>
                  {uniqueVulns.length >= 3 && (
                    <div style={{ marginBottom: 20 }}>
                      <h4 style={{ fontSize: "0.82rem", color: "var(--color-lexai-text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>🕸️ Issue Map</h4>
                      <LoopholeNetwork vulnerabilities={uniqueVulns.map((v, i) => ({
                        id: String(i), title: v.name, name: v.name, severity: v.severity,
                        affected_clause: v.affected_clause, connected_to: [],
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      } as any))} />
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {uniqueVulns.map((v, i) => (
                      <div key={i} className="glass-card" style={{ padding: 20 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                          <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700, background: `${getSeverityColor(v.severity)}20`, color: getSeverityColor(v.severity), flexShrink: 0 }}>{v.severity}</span>
                          <h4 style={{ fontWeight: 700, margin: 0, fontSize: "0.9rem" }}>{v.name}</h4>
                        </div>
                        {v.affected_clause && <p style={{ fontSize: "0.75rem", color: "var(--color-lexai-text-muted)", marginBottom: 8 }}>📍 Location: <strong>{v.affected_clause}</strong></p>}
                        <p style={{ fontSize: "0.83rem", lineHeight: 1.65, marginBottom: 12 }}>{v.explanation}</p>
                        {v.exploitation_scenario && (
                          <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
                            <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#f87171", marginBottom: 4 }}>⚠️ Possible Consequence</p>
                            <p style={{ fontSize: "0.78rem", color: "var(--color-lexai-text-muted)", lineHeight: 1.6 }}>{v.exploitation_scenario}</p>
                          </div>
                        )}
                        {v.suggested_fix && (
                          <div style={{ background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 8, padding: "10px 14px" }}>
                            <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#4ade80", marginBottom: 4 }}>✅ Recommended Change</p>
                            <p style={{ fontSize: "0.78rem", color: "var(--color-lexai-text-muted)", lineHeight: 1.6 }}>{v.suggested_fix}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Fixed contract tab ── */}
          {activeTab === "document" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <h3 style={{ fontWeight: 700, margin: 0 }}>📝 AI-Fixed Contract</h3>
                <button className="btn-secondary" onClick={handleDownload}>⬇️ Download .txt</button>
              </div>
              <div style={{ background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 14, padding: 24 }}>
                <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", lineHeight: 1.8, whiteSpace: "pre-wrap", color: "var(--color-lexai-text)", margin: 0 }}>
                  {result.final_document || "No fixed document generated."}
                </pre>
              </div>
            </div>
          )}

          {/* ── Rounds tab ── */}
          {activeTab === "rounds" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {result.rounds.map(r => (
                <div key={r.round_number} className="glass-card" style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <h4 style={{ fontWeight: 700, margin: "0 0 4px" }}>Round {r.round_number}</h4>
                      <p style={{ fontSize: "0.75rem", color: "var(--color-lexai-text-muted)", margin: 0 }}>
                        {r.vulnerabilities_found} problems · {r.patches_applied} fixes applied
                      </p>
                    </div>
                    <div style={{ fontSize: "2rem", fontWeight: 900, color: getScoreColor(r.score) }}>{r.score}</div>
                  </div>
                  {r.patch_summary && (
                    <div style={{ background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 8, padding: "10px 14px" }}>
                      <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#4ade80", marginBottom: 4 }}>What was fixed</p>
                      <p style={{ fontSize: "0.78rem", color: "var(--color-lexai-text-muted)", lineHeight: 1.6 }}>{r.patch_summary}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Case law tab ── */}
          {activeTab === "caselaw" && (
            <div>
              <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                <input className="lexai-input" style={{ flex: 1 }} placeholder="Filter by court (e.g. Supreme Court)…" value={kanoonCourt} onChange={e => setKanoonCourt(e.target.value)} />
                <button className="btn-secondary" onClick={() => fetchCaseLaw("creator contract", kanoonCourt)}>🔍 Refresh</button>
              </div>
              {kanoonLoading ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--color-lexai-text-muted)" }}>Loading case law…</div>
              ) : kanoonResults.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, background: "var(--color-lexai-surface-2)", borderRadius: 16, border: "1px dashed var(--color-lexai-border)" }}>
                  <p style={{ fontSize: "0.85rem", color: "var(--color-lexai-text-muted)" }}>No case law found. Try a different court filter.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {kanoonResults.map(k => (
                    <a key={k.tid} href={k.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                      <div className="glass-card" style={{ padding: 18, transition: "border-color 0.2s", cursor: "pointer" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-lexai-accent)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-lexai-border)"; }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 10, background: "rgba(96,165,250,0.1)", color: "#60a5fa", fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{k.doc_type}</span>
                          <div>
                            <p style={{ fontWeight: 700, color: "var(--color-lexai-text)", fontSize: "0.88rem", margin: "0 0 4px" }}>{k.title}</p>
                            <p style={{ fontSize: "0.75rem", color: "var(--color-lexai-text-muted)", margin: "0 0 6px" }}>{k.court} · {k.date}</p>
                            <p style={{ fontSize: "0.78rem", color: "var(--color-lexai-text-muted)", lineHeight: 1.6, margin: 0 }} dangerouslySetInnerHTML={{ __html: k.headline }} />
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Negotiate tab ── */}
          {activeTab === "negotiate" && (
            <NegotiateTab vulnerabilities={uniqueVulns} />
          )}
        </div>
      )}
    </div>
  );
}
