"use client";

import { useState } from "react";
import NegotiateTab from "@/components/NegotiateTab";
import type { Vulnerability } from "@/lib/api";

type CreatorVulnerability = Vulnerability;

const TONE_INFO = {
  gentle: { icon: "🤝", label: "Gentle", desc: "Friendly and understanding — good for first contact or long-term brand relationships." },
  collaborative: { icon: "💬", label: "Collaborative", desc: "Professional and solution-focused — best for most brand negotiations." },
  firm: { icon: "⚖️", label: "Firm", desc: "Direct and assertive — for when the brand has already ignored earlier requests." },
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

export default function NegotiatePage() {
  const [useSample, setUseSample] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customBrand, setCustomBrand] = useState("");

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.8rem", fontWeight: 900, margin: 0 }}>
          📧 Negotiate with Brands
        </h1>
        <p style={{ color: "var(--color-lexai-text-muted)", marginTop: 6, fontSize: "0.9rem", lineHeight: 1.6 }}>
          Generate a professional negotiation email based on your contract issues. Choose your tone — the AI writes the email so you don't have to.
        </p>
      </div>

      {/* How it works */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
        {[
          { step: "01", text: "Check your contract first using \u201cCheck My Contract\u201d" },
          { step: "02", text: "Come back here — issues are pre-loaded automatically" },
          { step: "03", text: "Pick a tone, add names, and copy your email" },
        ].map(s => (
          <div key={s.step} style={{ flex: 1, minWidth: 200, background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 900, color: "var(--color-lexai-accent)", fontSize: "1.1rem", flexShrink: 0 }}>{s.step}</span>
            <p style={{ fontSize: "0.82rem", color: "var(--color-lexai-text-muted)", lineHeight: 1.6, margin: 0 }}>{s.text}</p>
          </div>
        ))}
      </div>

      {/* Personalization row */}
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

      {/* Toggle: use sample issues */}
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

      {/* Tones info */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {Object.entries(TONE_INFO).map(([key, t]) => (
          <div key={key} style={{ flex: 1, minWidth: 180, background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: "1.3rem", marginBottom: 6 }}>{t.icon}</div>
            <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 4 }}>{t.label}</div>
            <p style={{ fontSize: "0.75rem", color: "var(--color-lexai-text-muted)", lineHeight: 1.5, margin: 0 }}>{t.desc}</p>
          </div>
        ))}
      </div>

      {/* Negotiate tab component */}
      <div style={{ background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 16, padding: 24 }}>
        <NegotiateTab vulnerabilities={useSample ? SAMPLE_ISSUES : []} />
      </div>
    </div>
  );
}
