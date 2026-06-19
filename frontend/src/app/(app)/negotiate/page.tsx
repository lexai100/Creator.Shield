"use client";

import { useState } from "react";
import NegotiateTab from "@/components/NegotiateTab";
import type { Vulnerability } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://creatorshield.onrender.com";

const TONE_INFO = {
  gentle:        { icon: "🤝", label: "Gentle",        desc: "Friendly and understanding — good for first contact or long-term brand relationships." },
  collaborative: { icon: "💬", label: "Collaborative", desc: "Professional and solution-focused — best for most brand negotiations." },
  firm:          { icon: "⚖️", label: "Firm",          desc: "Direct and assertive — for when the brand has already ignored earlier requests." },
};

const SAMPLE_ISSUES: Vulnerability[] = [
  {
    name: "Unlimited exclusivity clause",
    severity: "HIGH",
    affected_clause: "Exclusivity",
    explanation: "The contract bans you from working with any competitor brand for 12 months with no additional compensation.",
    exploitation_scenario: "Brand could prevent you from earning income from similar partnerships for a year.",
    suggested_fix: "Limit exclusivity to 30 days post-campaign, or require additional payment for extended exclusivity.",
  },
  {
    name: "Perpetual content license",
    severity: "HIGH",
    affected_clause: "License",
    explanation: "The brand gets the right to use your content forever, anywhere, for any purpose.",
    exploitation_scenario: "Brand could run ads using your face/voice years after the campaign ends without paying you more.",
    suggested_fix: "Add a 2-year license cap with option to renew. Include a whitelist fee for paid promotion use.",
  },
];

type Mode = "contract" | "describe";

export default function NegotiatePage() {
  const [mode, setMode] = useState<Mode>("contract");
  const [useSample, setUseSample] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customBrand, setCustomBrand] = useState("");

  // "Describe your issue" mode state
  const [situation, setSituation] = useState("");
  const [tone, setTone] = useState<"gentle" | "collaborative" | "firm">("collaborative");
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateFromDescription = async () => {
    if (!situation.trim()) return;
    setGenerating(true);
    setGeneratedEmail(null);
    try {
      const res = await fetch(`${API_BASE}/api/negotiate/generate-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation: situation.trim(),
          creator_name: customName || undefined,
          brand_name: customBrand || undefined,
          tone,
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setGeneratedEmail({ subject: data.email_subject, body: data.email_body });
    } catch {
      // Fallback: generate a simple email client-side
      setGeneratedEmail({
        subject: `Re: Collaboration Discussion — ${customBrand || "Brand"}`,
        body: `Hi ${customBrand ? customBrand + " Team" : "there"},\n\nI hope this message finds you well. I wanted to reach out regarding the following concern:\n\n${situation.trim()}\n\nI'd love to discuss this further to find a solution that works for both of us. Please let me know a good time to connect.\n\nWarm regards,\n${customName || "[Your Name]"}`,
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyEmail = () => {
    if (!generatedEmail) return;
    navigator.clipboard.writeText(`Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.8rem", fontWeight: 900, margin: 0 }}>
          📧 Negotiate with Brands
        </h1>
        <p style={{ color: "var(--color-lexai-text-muted)", marginTop: 6, fontSize: "0.9rem", lineHeight: 1.6 }}>
          Generate a professional negotiation email — whether you have a contract to review or just a situation to describe.
        </p>
      </div>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 10, marginBottom: 28, background: "var(--color-lexai-surface-2)", borderRadius: 14, padding: 5, width: "fit-content", border: "1px solid var(--color-lexai-border)" }}>
        {([
          { id: "contract", label: "📄 I have a contract", desc: "Issues pre-loaded from Check My Contract" },
          { id: "describe", label: "✍️ Describe my situation", desc: "No contract? Just explain and we'll write the email" },
        ] as { id: Mode; label: string; desc: string }[]).map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            style={{
              padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer",
              fontWeight: 600, fontSize: "0.85rem", transition: "all 0.2s",
              background: mode === m.id ? "var(--color-lexai-accent)" : "transparent",
              color: mode === m.id ? "#0d0b08" : "var(--color-lexai-text-muted)",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Personalization — shared across both modes */}
      <div style={{ background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 16, padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 16 }}>Personalise Your Email</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--color-lexai-text-muted)", display: "block", marginBottom: 6 }}>Your Name (Creator)</label>
            <input className="lexai-input" placeholder="e.g. Ananya Singh" value={customName} onChange={e => setCustomName(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--color-lexai-text-muted)", display: "block", marginBottom: 6 }}>Brand / Company Name</label>
            <input className="lexai-input" placeholder="e.g. BrandX India" value={customBrand} onChange={e => setCustomBrand(e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── MODE: Describe your situation ── */}
      {mode === "describe" && (
        <>
          <div style={{ background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 16, padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 6 }}>Describe Your Situation</h3>
            <p style={{ fontSize: "0.78rem", color: "var(--color-lexai-text-muted)", marginBottom: 14 }}>
              Explain what happened or what you want to negotiate. The AI will write a professional email for you.
            </p>
            <textarea
              value={situation}
              onChange={e => setSituation(e.target.value)}
              placeholder={`e.g. "The brand paid me 2 months late and is now demanding I post again before settling the invoice. I want to push back professionally without damaging the relationship."`}
              rows={5}
              style={{
                width: "100%", background: "var(--color-lexai-surface)", border: "1.5px solid var(--color-lexai-border)",
                borderRadius: 12, padding: "12px 14px", fontSize: "0.88rem",
                color: "var(--color-lexai-text)", resize: "vertical", outline: "none",
                fontFamily: "var(--font-body)", lineHeight: 1.6, boxSizing: "border-box",
              }}
              onFocus={e => { (e.target as HTMLElement).style.borderColor = "var(--color-lexai-accent)"; }}
              onBlur={e => { (e.target as HTMLElement).style.borderColor = "var(--color-lexai-border)"; }}
            />
          </div>

          {/* Tone picker */}
          <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
            {(Object.entries(TONE_INFO) as [typeof tone, typeof TONE_INFO[keyof typeof TONE_INFO]][]).map(([key, t]) => (
              <button
                key={key}
                onClick={() => setTone(key)}
                style={{
                  flex: 1, minWidth: 160, padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                  border: `1.5px solid ${tone === key ? "var(--color-lexai-accent)" : "var(--color-lexai-border)"}`,
                  background: tone === key ? "rgba(212,130,26,0.08)" : "var(--color-lexai-surface-2)",
                  textAlign: "left", transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: "1.3rem", marginBottom: 5 }}>{t.icon}</div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 3 }}>{t.label}</div>
                <p style={{ fontSize: "0.72rem", color: "var(--color-lexai-text-muted)", lineHeight: 1.5, margin: 0 }}>{t.desc}</p>
              </button>
            ))}
          </div>

          <button
            onClick={generateFromDescription}
            disabled={!situation.trim() || generating}
            style={{
              width: "100%", padding: "14px", borderRadius: 12, border: "none",
              background: situation.trim() && !generating ? "var(--color-lexai-accent)" : "var(--color-lexai-surface-2)",
              color: situation.trim() && !generating ? "#0d0b08" : "var(--color-lexai-text-muted)",
              fontWeight: 700, fontSize: "0.95rem", cursor: situation.trim() && !generating ? "pointer" : "not-allowed",
              marginBottom: 24, transition: "all 0.2s",
            }}
          >
            {generating ? "✍️ Writing your email…" : "✍️ Generate Email"}
          </button>

          {generatedEmail && (
            <div style={{ background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700, fontSize: "0.95rem", margin: 0 }}>✅ Your Email</h3>
                <button
                  onClick={copyEmail}
                  style={{
                    padding: "7px 16px", borderRadius: 8, border: "1px solid var(--color-lexai-border)",
                    background: copied ? "rgba(34,197,94,0.1)" : "var(--color-lexai-surface)",
                    color: copied ? "#22c55e" : "var(--color-lexai-text-muted)",
                    fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                  }}
                >
                  {copied ? "✓ Copied!" : "📋 Copy"}
                </button>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: "0.72rem", color: "var(--color-lexai-text-muted)", fontWeight: 600 }}>SUBJECT</span>
                <p style={{ fontWeight: 700, margin: "4px 0 0", fontSize: "0.9rem" }}>{generatedEmail.subject}</p>
              </div>
              <div style={{ borderTop: "1px solid var(--color-lexai-border)", paddingTop: 14 }}>
                <span style={{ fontSize: "0.72rem", color: "var(--color-lexai-text-muted)", fontWeight: 600 }}>BODY</span>
                <pre style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: "8px 0 0", color: "var(--color-lexai-text)" }}>
                  {generatedEmail.body}
                </pre>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── MODE: Contract issues ── */}
      {mode === "contract" && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            {[
              { step: "01", text: "Check your contract first using \"Check My Contract\"" },
              { step: "02", text: "Come back here — issues are pre-loaded automatically" },
              { step: "03", text: "Pick a tone, add names, and copy your email" },
            ].map(s => (
              <div key={s.step} style={{ flex: 1, minWidth: 200, background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 900, color: "var(--color-lexai-accent)", fontSize: "1.1rem", flexShrink: 0 }}>{s.step}</span>
                <p style={{ fontSize: "0.82rem", color: "var(--color-lexai-text-muted)", lineHeight: 1.6, margin: 0 }}>{s.text}</p>
              </div>
            ))}
          </div>

          <div style={{ background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 16, padding: 20, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: useSample ? 16 : 0 }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: "0.9rem", margin: 0 }}>Contract Issues to Address</h3>
                <p style={{ fontSize: "0.75rem", color: "var(--color-lexai-text-muted)", marginTop: 4 }}>
                  Run "Check My Contract" first for real issues, or try a demo below.
                </p>
              </div>
              <button
                onClick={() => setUseSample(s => !s)}
                style={{
                  padding: "7px 14px", borderRadius: 10, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                  background: useSample ? "rgba(212,130,26,0.12)" : "var(--color-lexai-surface)",
                  border: "1px solid " + (useSample ? "rgba(212,130,26,0.3)" : "var(--color-lexai-border)"),
                  color: useSample ? "var(--color-lexai-accent)" : "var(--color-lexai-text-muted)",
                }}
              >
                {useSample ? "✓ Using Demo Issues" : "Try with Demo Issues"}
              </button>
            </div>
            {useSample && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {SAMPLE_ISSUES.map((issue, i) => (
                  <div key={i} style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "rgba(248,113,113,0.2)", color: "#f87171" }}>{issue.severity}</span>
                      <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{issue.name}</span>
                    </div>
                    <p style={{ fontSize: "0.78rem", color: "var(--color-lexai-text-muted)", margin: 0, lineHeight: 1.5 }}>{issue.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            {Object.entries(TONE_INFO).map(([key, t]) => (
              <div key={key} style={{ flex: 1, minWidth: 180, background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: "1.3rem", marginBottom: 6 }}>{t.icon}</div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 4 }}>{t.label}</div>
                <p style={{ fontSize: "0.75rem", color: "var(--color-lexai-text-muted)", lineHeight: 1.5, margin: 0 }}>{t.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 16, padding: 24 }}>
            <NegotiateTab vulnerabilities={useSample ? SAMPLE_ISSUES : []} />
          </div>
        </>
      )}
    </div>
  );
}
