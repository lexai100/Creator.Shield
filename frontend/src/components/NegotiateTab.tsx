// NegotiateTab — Negotiation email generator panel
// This is rendered inline in page.tsx as {activeResultTab === "negotiate" && <NegotiateTab ... />}

"use client";

import { useState } from "react";
import { generateNegotiationScript, type NegotiationScriptResponse, type Vulnerability } from "@/lib/api";

interface NegotiateTabProps {
  vulnerabilities: Vulnerability[];
}

export default function NegotiateTab({ vulnerabilities }: NegotiateTabProps) {
  const [email, setEmail] = useState<NegotiationScriptResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState<"gentle" | "collaborative" | "firm">("collaborative");
  const [copied, setCopied] = useState(false);
  const [creatorName, setCreatorName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle" | "success" | "error">("idle");

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://creatorshield.onrender.com";

  const handleGenerate = async () => {
    setLoading(true);
    setEmail(null);
    try {
      const result = await generateNegotiationScript({
        flagged_issues: vulnerabilities as any,
        tone,
        creator_name: creatorName || undefined,
        brand_name: brandName || undefined,
      });
      setEmail(result);
    } catch {
      alert("Failed to generate email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!email) return;
    navigator.clipboard.writeText(`Subject: ${email.email_subject}\n\n${email.email_body}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleMailto = () => {
    if (!email) return;
    const subject = encodeURIComponent(email.email_subject);
    const body = encodeURIComponent(email.email_body);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleSendEmail = async () => {
    if (!email || !recipientEmail.trim()) return;
    setSending(true);
    setSendStatus("idle");
    try {
      const res = await fetch(`${API_BASE}/api/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipientEmail.trim(),
          subject: email.email_subject,
          body: email.email_body,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSendStatus("success");
      setTimeout(() => setSendStatus("idle"), 5000);
    } catch {
      setSendStatus("error");
      setTimeout(() => setSendStatus("idle"), 4000);
    } finally {
      setSending(false);
    }
  };

  const tones = [
    { value: "gentle" as const, emoji: "🤝", label: "Friendly", desc: "Soft, relationship-first" },
    { value: "collaborative" as const, emoji: "⚖️", label: "Balanced", desc: "Professional & clear" },
    { value: "firm" as const, emoji: "💼", label: "Firm", desc: "Strong & assertive" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-1">📧 Get Your Negotiation Email</h3>
        <p style={{ fontSize: "0.82rem", color: "var(--color-lexai-text-muted)", lineHeight: 1.6 }}>
          Based on all the contract problems we found, we will write a professional email you can
          send to the brand asking them to fix the issues before you sign.
          Pick a tone that fits your relationship with them.
        </p>
      </div>

      {/* Config card */}
      <div className="glass-card p-5 mb-5">
        {/* Name inputs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-lexai-text-muted)", display: "block", marginBottom: 6 }}>
              Your Name (optional)
            </label>
            <input
              className="lexai-input"
              placeholder="e.g. Priya Sharma"
              value={creatorName}
              onChange={e => setCreatorName(e.target.value)}
              style={{ fontSize: "0.88rem" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-lexai-text-muted)", display: "block", marginBottom: 6 }}>
              Brand / Company Name (optional)
            </label>
            <input
              className="lexai-input"
              placeholder="e.g. GlowBrand India"
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              style={{ fontSize: "0.88rem" }}
            />
          </div>
        </div>

        {/* Tone selector */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-lexai-text-muted)", display: "block", marginBottom: 8 }}>
            Email Tone
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tones.map(t => (
              <button
                key={t.value}
                onClick={() => setTone(t.value)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: `1px solid ${tone === t.value ? "var(--color-lexai-accent)" : "var(--color-lexai-border)"}`,
                  background: tone === t.value ? "rgba(212,130,26,0.12)" : "transparent",
                  color: tone === t.value ? "var(--color-lexai-accent-glow)" : "var(--color-lexai-text-muted)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: "1rem", marginBottom: 2, fontWeight: 600 }}>{t.emoji} {t.label}</div>
                <div style={{ fontSize: "0.68rem", opacity: 0.7 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button className="btn-primary" disabled={loading} onClick={handleGenerate}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {loading ? (
              <>
                <span style={{ width: 16, height: 16, border: "2px solid #0d0b08", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 1s linear infinite" }} />
                Writing your email…
              </>
            ) : "✍️ Generate My Negotiation Email"}
          </span>
        </button>
      </div>

      {/* Email preview */}
      {email && (
        <div className="animate-slide-up">
          {/* Subject bar */}
          <div style={{ padding: "12px 16px", background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderBottom: "none", borderRadius: "12px 12px 0 0", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-lexai-text-muted)", flexShrink: 0 }}>Subject:</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-lexai-text)", flex: 1 }}>{email.email_subject}</span>
            <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: 999, background: "rgba(212,130,26,0.12)", color: "var(--color-lexai-accent-glow)", border: "1px solid rgba(212,130,26,0.2)", textTransform: "capitalize" }}>
              {email.tone_used} tone
            </span>
          </div>

          {/* Body */}
          <div style={{ padding: "20px", background: "var(--color-lexai-surface)", border: "1px solid var(--color-lexai-border)", borderRadius: "0 0 12px 12px", fontSize: "0.88rem", lineHeight: 1.75, color: "var(--color-lexai-text)", whiteSpace: "pre-wrap", maxHeight: 480, overflowY: "auto" }}>
            {email.email_body}
          </div>

          {/* Issues count */}
          {email.issues_addressed > 0 && (
            <p style={{ fontSize: "0.75rem", color: "var(--color-lexai-text-muted)", marginTop: 8 }}>
              This email addresses <strong style={{ color: "var(--color-lexai-accent-glow)" }}>{email.issues_addressed}</strong> contract issues found during analysis.
            </p>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn-primary" style={{ fontSize: "0.85rem", padding: "10px 20px" }} onClick={handleCopy}>
              <span>{copied ? "✓ Copied!" : "📋 Copy Email"}</span>
            </button>
            <button className="btn-secondary" style={{ fontSize: "0.85rem", padding: "10px 20px" }} onClick={handleMailto}>
              📬 Open in Mail App
            </button>
            <button className="btn-secondary" style={{ fontSize: "0.85rem", padding: "10px 20px" }} onClick={() => setEmail(null)}>
              ↺ Regenerate
            </button>
          </div>

          {/* Send directly via n8n */}
          <div style={{ marginTop: 18, padding: "16px 18px", background: "rgba(212,130,26,0.05)", border: "1px solid rgba(212,130,26,0.2)", borderRadius: 12 }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, marginBottom: 10, color: "var(--color-lexai-accent-glow)" }}>📨 Send directly to brand&apos;s email</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="lexai-input"
                type="email"
                placeholder="brand@company.com"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                style={{ fontSize: "0.85rem", flex: 1 }}
              />
              <button
                onClick={handleSendEmail}
                disabled={sending || !recipientEmail.trim()}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: sending || !recipientEmail.trim() ? "not-allowed" : "pointer",
                  background: sendStatus === "success" ? "rgba(34,197,94,0.15)" : sendStatus === "error" ? "rgba(239,68,68,0.15)" : "var(--color-lexai-accent)",
                  color: sendStatus === "success" ? "#22c55e" : sendStatus === "error" ? "#ef4444" : "#0d0b08",
                  opacity: !recipientEmail.trim() ? 0.5 : 1,
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {sending ? (
                  <><span style={{ width: 14, height: 14, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 1s linear infinite" }} /> Sending…</>
                ) : sendStatus === "success" ? "✓ Sent!"
                  : sendStatus === "error" ? "✗ Failed"
                  : "📨 Send"}
              </button>
            </div>
            {sendStatus === "error" && (
              <p style={{ fontSize: "0.72rem", color: "#ef4444", marginTop: 6 }}>Failed to send. Make sure N8N_WEBHOOK_URL is set in Render environment variables.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
