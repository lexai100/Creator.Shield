"use client";

import { useState, useEffect } from "react";
import { getProfile, saveProfile } from "@/lib/store";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => { const p = getProfile(); if (p) setName(p.name); }, []);

  const handleSave = () => {
    saveProfile({ name: name.trim(), joinedAt: getProfile()?.joinedAt ?? new Date().toISOString() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 520 }}>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.8rem", fontWeight: 900, margin: "0 0 8px" }}>⚙️ Settings</h1>
      <p style={{ color: "var(--color-lexai-text-muted)", fontSize: "0.9rem", marginBottom: 28 }}>Manage your profile and preferences</p>

      <div style={{ background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 16 }}>Your Profile</h3>
        <label style={{ fontSize: "0.78rem", color: "var(--color-lexai-text-muted)", display: "block", marginBottom: 8 }}>Display Name</label>
        <input className="lexai-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={{ marginBottom: 14 }} />
        <button className="btn-primary" onClick={handleSave} disabled={!name.trim()}>
          {saved ? "✓ Saved!" : "Save Changes"}
        </button>
      </div>

      <div style={{ background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 16, padding: 24 }}>
        <h3 style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 12 }}>Data & Privacy</h3>
        <p style={{ fontSize: "0.82rem", color: "var(--color-lexai-text-muted)", lineHeight: 1.6, marginBottom: 16 }}>
          🔒 All your conversations, documents, and notes are stored <strong style={{ color: "var(--color-lexai-text)" }}>only on this device</strong> using your browser's local storage. Nothing is sent to any server except when the AI is processing your request.
        </p>
        <button
          style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", color: "var(--color-lexai-danger)", fontSize: "0.82rem", cursor: "pointer", fontFamily: "var(--font-body)" }}
          onClick={() => { if (confirm("Clear ALL local data? This cannot be undone.")) { localStorage.clear(); window.location.href = "/"; } }}
        >
          Clear All Data
        </button>
      </div>
    </div>
  );
}
