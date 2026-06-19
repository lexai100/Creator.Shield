"use client";

import { useState, useRef, useEffect } from "react";
import { getConversations, type CSConversation } from "@/lib/store";
import BusinessSetupChat from "@/components/BusinessSetupChat";

export default function BusinessPage() {
  const [sessions, setSessions] = useState<CSConversation[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);

  useEffect(() => {
    const all = getConversations().filter(c => c.type === "general" || c.type === "check");
    // For now show all recent chats as potential "sessions to continue"
    setSessions(getConversations().slice(0, 8));
  }, []);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>
      {/* Recent sessions sidebar */}
      <div style={{
        width: 260, flexShrink: 0,
        borderRight: "1px solid var(--color-lexai-border)",
        background: "var(--color-lexai-surface)",
        display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}>
        <div style={{ padding: "16px 16px 10px" }}>
          <h3 style={{ fontWeight: 800, fontSize: "0.85rem", color: "var(--color-lexai-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
            🏢 Business Setup
          </h3>
          <p style={{ fontSize: "0.72rem", color: "var(--color-lexai-text-muted)", marginTop: 4, lineHeight: 1.5 }}>
            AI-guided setup for Indian creators
          </p>
        </div>

        <div style={{ padding: "8px 10px 6px" }}>
          <button
            onClick={() => setActiveSession(null)}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 10,
              background: !activeSession ? "rgba(212,130,26,0.12)" : "transparent",
              border: "1px solid " + (!activeSession ? "rgba(212,130,26,0.3)" : "transparent"),
              color: !activeSession ? "var(--color-lexai-accent)" : "var(--color-lexai-text)",
              fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", textAlign: "left",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <span>✦</span> New Session
          </button>
        </div>

        {sessions.length > 0 && (
          <div style={{ padding: "6px 10px" }}>
            <p style={{ fontSize: "0.68rem", color: "var(--color-lexai-text-muted)", padding: "4px 4px 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Recent</p>
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSession(s.id)}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 10, marginBottom: 4,
                  background: activeSession === s.id ? "rgba(255,255,255,0.06)" : "transparent",
                  border: "1px solid " + (activeSession === s.id ? "var(--color-lexai-border)" : "transparent"),
                  color: "var(--color-lexai-text)", fontSize: "0.8rem", cursor: "pointer",
                  textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <span style={{ flexShrink: 0, fontSize: "0.85rem" }}>🏢</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Help blurb */}
        <div style={{ marginTop: "auto", padding: 16 }}>
          <div style={{ background: "rgba(212,130,26,0.07)", border: "1px solid rgba(212,130,26,0.15)", borderRadius: 12, padding: 12 }}>
            <p style={{ fontSize: "0.73rem", color: "var(--color-lexai-text-muted)", lineHeight: 1.6, margin: 0 }}>
              💡 <strong style={{ color: "var(--color-lexai-text)" }}>How it works</strong><br />
              Tell the AI about your creator business — platform, revenue, team size — and it builds a personalised checklist of licences, registrations, and legal steps you need in India.
            </p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <BusinessSetupChat />
      </div>
    </div>
  );
}
