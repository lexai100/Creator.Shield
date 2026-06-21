"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RedFlag {
  flag: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  quote: string;
}

interface ScamResult {
  scam_score: number;
  verdict: "DEFINITELY_SCAM" | "LIKELY_SCAM" | "SUSPICIOUS" | "POSSIBLY_LEGIT" | "LIKELY_LEGIT";
  red_flags: RedFlag[];
  safe_signals: string[];
  recommendation: string;
  summary: string;
}

function getScoreColor(score: number) {
  if (score >= 75) return "#ef4444";
  if (score >= 50) return "#f97316";
  if (score >= 30) return "#eab308";
  return "#22c55e";
}

function getVerdictConfig(verdict: string) {
  const configs: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    DEFINITELY_SCAM:  { label: "Definitely a Scam 🚨",   color: "#ef4444", bg: "rgba(239,68,68,0.08)",   icon: "🚨" },
    LIKELY_SCAM:      { label: "Likely a Scam 🔴",        color: "#f97316", bg: "rgba(249,115,22,0.08)",  icon: "🔴" },
    SUSPICIOUS:       { label: "Suspicious ⚠️",            color: "#eab308", bg: "rgba(234,179,8,0.08)",   icon: "⚠️" },
    POSSIBLY_LEGIT:   { label: "Possibly Legitimate 🟡",  color: "#84cc16", bg: "rgba(132,204,22,0.08)",  icon: "🟡" },
    LIKELY_LEGIT:     { label: "Looks Legitimate ✅",      color: "#22c55e", bg: "rgba(34,197,94,0.08)",   icon: "✅" },
  };
  return configs[verdict] ?? configs.SUSPICIOUS;
}

function getSeverityColor(sev: string) {
  if (sev === "HIGH") return "#ef4444";
  if (sev === "MEDIUM") return "#f97316";
  return "#eab308";
}

export default function ScamCheckPage() {
  const [emailText, setEmailText] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScamResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!emailText.trim() || emailText.trim().length < 20) return;
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/scam-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_text: emailText, sender_email: senderEmail }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setEmailText("");
    setSenderEmail("");
  };

  const scoreColor = result ? getScoreColor(result.scam_score) : "#22c55e";
  const verdictConfig = result ? getVerdictConfig(result.verdict) : null;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 860, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <div style={{ fontSize: "2.5rem" }}>🛡️</div>
          <div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.8rem", fontWeight: 900, margin: 0 }}>
              Brand Deal Scam Checker
            </h1>
            <p style={{ color: "var(--color-lexai-text-muted)", marginTop: 4, fontSize: "0.9rem" }}>
              Got a suspicious brand deal email? Paste it below — our AI will scan it for scam patterns in seconds.
            </p>
          </div>
        </div>

        {/* How-it-works pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          {["Fake brand detection", "Upfront fee scams", "Unrealistic pay", "Personal data harvesting", "Urgency pressure"].map(tag => (
            <span key={tag} style={{
              fontSize: "0.72rem", padding: "4px 10px", borderRadius: 20,
              background: "rgba(212,130,26,0.1)", border: "1px solid rgba(212,130,26,0.2)",
              color: "var(--color-lexai-accent)", fontWeight: 600,
            }}>{tag}</span>
          ))}
        </div>
      </div>

      {/* Input form */}
      {!result && (
        <div className="glass-card" style={{ padding: "28px 32px" }}>
          {/* Sender email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-lexai-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
              📧 Sender Email Address <span style={{ fontWeight: 400, color: "var(--color-lexai-text-muted)" }}>(optional, but helps detection)</span>
            </label>
            <input
              className="lexai-input"
              type="email"
              placeholder="e.g. partnerships@amazon-india-collab.gmail.com"
              value={senderEmail}
              onChange={e => setSenderEmail(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          {/* Email body */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-lexai-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
              📨 Paste the Email Content
            </label>
            <textarea
              className="lexai-textarea"
              rows={10}
              placeholder={`Paste the full email text here...\n\nExample: "Hi! I'm reaching out on behalf of XYZ Brand. We'd love to collaborate with you for our campaign. Budget: ₹30,000 for 2 Instagram posts. Please share your Aadhaar and bank details to proceed. This offer is valid for 24 hours only!"`}
              value={emailText}
              onChange={e => setEmailText(e.target.value)}
              style={{ width: "100%" }}
            />
            <p style={{ fontSize: "0.72rem", color: "var(--color-lexai-text-muted)", marginTop: 6 }}>
              {emailText.length} characters · minimum 20 required
            </p>
          </div>

          <button
            onClick={handleCheck}
            disabled={isLoading || emailText.trim().length < 20}
            className="btn-primary"
            style={{ width: "100%", padding: "14px", fontSize: "1rem", opacity: emailText.trim().length < 20 ? 0.4 : 1 }}
          >
            {isLoading ? "🔍 Analyzing..." : "🛡️ Check for Scams"}
          </button>

          {/* Loading state */}
          {isLoading && (
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <div style={{ width: 50, height: 50, borderRadius: "50%", border: "3px solid var(--color-lexai-accent)", borderTopColor: "transparent", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
              <p style={{ color: "var(--color-lexai-text-muted)", fontSize: "0.9rem" }}>
                Scanning for scam patterns…
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 16, padding: 20, marginTop: 16 }}>
          <p style={{ color: "#f87171", fontWeight: 700, marginBottom: 6 }}>Analysis Failed</p>
          <p style={{ color: "var(--color-lexai-text-muted)", fontSize: "0.85rem" }}>{error}</p>
          <button className="btn-secondary" style={{ marginTop: 14 }} onClick={handleReset}>← Try Again</button>
        </div>
      )}

      {/* Results */}
      {result && verdictConfig && (
        <div>
          {/* Back */}
          <button onClick={handleReset} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20, padding: "8px 16px", borderRadius: 10, border: "1px solid var(--color-lexai-border)", background: "transparent", color: "var(--color-lexai-text-muted)", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
            ← Check Another Email
          </button>

          {/* Score Hero */}
          <div className="glass-card" style={{ padding: 32, textAlign: "center", marginBottom: 20, background: verdictConfig.bg, borderColor: verdictConfig.color + "40" }}>
            <div style={{ fontSize: "5rem", fontWeight: 900, color: scoreColor, lineHeight: 1, marginBottom: 8, fontFamily: "var(--font-heading)" }}>
              {result.scam_score}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-lexai-text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>Scam Score / 100</div>
            <div style={{ display: "inline-block", padding: "8px 20px", borderRadius: 30, background: verdictConfig.color + "20", border: `1px solid ${verdictConfig.color}50`, color: verdictConfig.color, fontWeight: 800, fontSize: "1rem" }}>
              {verdictConfig.label}
            </div>
            <p style={{ color: "var(--color-lexai-text-muted)", fontSize: "0.88rem", marginTop: 16, lineHeight: 1.6, maxWidth: 600, margin: "16px auto 0" }}>
              {result.summary}
            </p>
          </div>

          {/* Recommendation box */}
          <div style={{ background: "rgba(212,130,26,0.07)", border: "1px solid rgba(212,130,26,0.25)", borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>💡</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--color-lexai-accent)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>What to do</p>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>{result.recommendation}</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: result.safe_signals.length > 0 ? "1fr 1fr" : "1fr", gap: 16, marginBottom: 20 }}>
            {/* Red Flags */}
            {result.red_flags.length > 0 && (
              <div className="glass-card" style={{ padding: 20 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  🚩 Red Flags <span style={{ fontSize: "0.8rem", background: "rgba(239,68,68,0.15)", color: "#f87171", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>{result.red_flags.length}</span>
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {result.red_flags.map((f, i) => (
                    <div key={i} style={{ background: "var(--color-lexai-surface)", borderRadius: 10, padding: "12px 14px", borderLeft: `3px solid ${getSeverityColor(f.severity)}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: f.quote ? 6 : 0 }}>
                        <p style={{ fontWeight: 600, fontSize: "0.85rem", margin: 0 }}>{f.flag}</p>
                        <span style={{ fontSize: "0.65rem", padding: "2px 7px", borderRadius: 10, background: getSeverityColor(f.severity) + "20", color: getSeverityColor(f.severity), fontWeight: 700, flexShrink: 0 }}>
                          {f.severity}
                        </span>
                      </div>
                      {f.quote && (
                        <p style={{ fontSize: "0.75rem", color: "var(--color-lexai-text-muted)", fontStyle: "italic", margin: 0, borderTop: "1px solid var(--color-lexai-border)", paddingTop: 6 }}>
                          "{f.quote}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Safe Signals */}
            {result.safe_signals.length > 0 && (
              <div className="glass-card" style={{ padding: 20 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  ✅ Looks OK <span style={{ fontSize: "0.8rem", background: "rgba(34,197,94,0.15)", color: "#4ade80", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>{result.safe_signals.length}</span>
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.safe_signals.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", background: "var(--color-lexai-surface)", borderRadius: 10, borderLeft: "3px solid #22c55e" }}>
                      <span style={{ color: "#4ade80", flexShrink: 0 }}>✓</span>
                      <p style={{ fontSize: "0.85rem", margin: 0 }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* No red flags state */}
          {result.red_flags.length === 0 && (
            <div style={{ textAlign: "center", padding: 32, background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 16, marginBottom: 20 }}>
              <div style={{ fontSize: "3rem", marginBottom: 10 }}>🎉</div>
              <p style={{ fontWeight: 700, color: "#4ade80", fontSize: "1.1rem" }}>No Scam Patterns Detected!</p>
              <p style={{ color: "var(--color-lexai-text-muted)", fontSize: "0.85rem", marginTop: 6 }}>
                This email looks legitimate — but always get a written contract before starting work.
              </p>
            </div>
          )}

          {/* n8n tip */}
          <div style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 14, padding: "14px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>⚡</span>
            <p style={{ fontSize: "0.8rem", color: "var(--color-lexai-text-muted)", lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: "#60a5fa" }}>Pro tip:</strong> Set up our Gmail automation — forward any suspicious deal email to <strong style={{ color: "var(--color-lexai-text)" }}>check@creatorshield.in</strong> and get an instant scam report back in your inbox. No need to open the website.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
