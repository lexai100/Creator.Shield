"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getProfile, saveProfile, type CSUserProfile } from "@/lib/store";

// ── First-visit name prompt ───────────────────────────────────────────────────

function NamePrompt({ onSave }: { onSave: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(13,11,8,0.92)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--color-lexai-surface)",
        border: "1px solid var(--color-lexai-border)",
        borderRadius: 20,
        padding: "40px 48px",
        width: "100%", maxWidth: 420,
        textAlign: "center",
        boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
      }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>🛡️</div>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", fontWeight: 800, marginBottom: 8 }}>
          Welcome to Creator<span style={{ color: "var(--color-lexai-accent)" }}>Shield</span>
        </h2>
        <p style={{ color: "var(--color-lexai-text-muted)", fontSize: "0.9rem", marginBottom: 28, lineHeight: 1.6 }}>
          What should we call you?
        </p>
        <input
          className="lexai-input"
          style={{ marginBottom: 16, textAlign: "center", fontSize: "1rem" }}
          placeholder="Your name…"
          value={name}
          autoFocus
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && name.trim()) onSave(name.trim()); }}
        />
        <button
          className="btn-primary"
          style={{ width: "100%", fontSize: "1rem", padding: "12px" }}
          disabled={!name.trim()}
          onClick={() => onSave(name.trim())}
        >
          Let's go →
        </button>
      </div>
    </div>
  );
}

// ── App Shell Layout ──────────────────────────────────────────────────────────

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<CSUserProfile | null | "loading">("loading");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  const handleSaveName = (name: string) => {
    const p: CSUserProfile = { name, joinedAt: new Date().toISOString() };
    saveProfile(p);
    setProfile(p);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/chat?q=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* First-visit name prompt */}
      {profile !== "loading" && !profile && (
        <NamePrompt onSave={handleSaveName} />
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* Top bar */}
        <header style={{
          height: 56,
          borderBottom: "1px solid var(--color-lexai-border)",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: 12,
          background: "var(--color-lexai-surface)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}>
          <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 520 }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-lexai-text-muted)", fontSize: "0.9rem" }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search chats, docs, notes… (Ctrl+K)"
                style={{
                  width: "100%",
                  background: "var(--color-lexai-surface-2)",
                  border: "1px solid var(--color-lexai-border)",
                  borderRadius: 10,
                  padding: "8px 12px 8px 34px",
                  fontSize: "0.85rem",
                  color: "var(--color-lexai-text)",
                  outline: "none",
                }}
              />
            </div>
          </form>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--color-lexai-success)" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-lexai-success)", animation: "pulse 2s infinite" }} />
            AI Ready
          </span>
          {profile && profile !== "loading" && (
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(212,130,26,0.2)",
              color: "var(--color-lexai-accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: "0.9rem", cursor: "pointer",
              border: "1.5px solid var(--color-lexai-accent)",
            }}>
              {(profile as CSUserProfile).name[0]?.toUpperCase()}
            </div>
          )}
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
