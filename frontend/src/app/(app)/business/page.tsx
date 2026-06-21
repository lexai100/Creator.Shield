"use client";

import { useState, useEffect } from "react";
import { getConversations, deleteConversation, newId, type CSConversation } from "@/lib/db";
import BusinessSetupChat from "@/components/BusinessSetupChat";

export default function BusinessPage() {
  const [sessions, setSessions] = useState<CSConversation[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(() => newId("biz-session"));
  const [sessionsCollapsed, setSessionsCollapsed] = useState(false);

  const refreshSessions = async () => {
    const convs = await getConversations("business");
    setSessions(convs.slice(0, 8));
  };

  const handleNewSession = () => {
    setActiveSession(null);
    setSessionKey(newId("biz-session"));
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteConversation(id);
    // Also remove the local chat storage for this session
    try { localStorage.removeItem(`cs_business_chat_v2_${id}`); } catch {}
    if (activeSession === id) {
      setActiveSession(null);
      setSessionKey(newId("biz-session"));
    }
    await refreshSessions();
  };

  useEffect(() => { refreshSessions(); }, []);

  const SidebarIcon = () => (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <line x1="5" y1="1.5" x2="5" y2="13.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  );

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>

      {/* ── Recent sessions sidebar ── */}
      <div style={{
        width: sessionsCollapsed ? 40 : 260, flexShrink: 0,
        transition: "width 0.25s ease",
        borderRight: "1px solid var(--color-lexai-border)",
        background: "var(--color-lexai-surface)",
        display: "flex", flexDirection: "column",
        overflowY: sessionsCollapsed ? "hidden" : "auto",
        overflowX: "hidden",
      }}>
        {/* Toggle + heading */}
        <div style={{ padding: "10px 6px 6px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setSessionsCollapsed(c => !c)}
            title={sessionsCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              width: 28, height: 28, borderRadius: 7,
              border: "1px solid var(--color-lexai-border)",
              background: "transparent",
              color: "var(--color-lexai-text-muted)",
              cursor: "pointer", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <SidebarIcon />
          </button>
          {!sessionsCollapsed && (
            <div>
              <h3 style={{ fontWeight: 800, fontSize: "0.85rem", color: "var(--color-lexai-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                🏢 Business Setup
              </h3>
              <p style={{ fontSize: "0.72rem", color: "var(--color-lexai-text-muted)", marginTop: 2, lineHeight: 1.4, marginBottom: 0 }}>
                AI-guided setup for Indian creators
              </p>
            </div>
          )}
        </div>

        {!sessionsCollapsed && (<>
          {/* New Session button */}
          <div style={{ padding: "4px 10px 6px" }}>
            <button
              onClick={handleNewSession}
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

          {/* Session list */}
          {sessions.length > 0 && (
            <div style={{ padding: "4px 10px" }}>
              <p style={{ fontSize: "0.68rem", color: "var(--color-lexai-text-muted)", padding: "4px 4px 6px", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Recent</p>
              {sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => setActiveSession(s.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    width: "100%", padding: "9px 10px", borderRadius: 10, marginBottom: 4,
                    background: activeSession === s.id ? "rgba(255,255,255,0.06)" : "transparent",
                    border: "1px solid " + (activeSession === s.id ? "var(--color-lexai-border)" : "transparent"),
                    color: "var(--color-lexai-text)", fontSize: "0.8rem", cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={e => { if (activeSession !== s.id) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={e => { if (activeSession !== s.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <span style={{ flexShrink: 0, fontSize: "0.85rem" }}>🏢</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                  {/* Delete button */}
                  <button
                    onClick={e => handleDeleteSession(e, s.id)}
                    title="Delete session"
                    style={{
                      flexShrink: 0, width: 22, height: 22, borderRadius: 6,
                      border: "none", background: "transparent",
                      color: "var(--color-lexai-text-muted)",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.75rem", opacity: 0,
                      transition: "opacity 0.15s, color 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.opacity = "1"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--color-lexai-text-muted)"; e.currentTarget.style.opacity = "0"; }}
                    className="session-delete-btn"
                  >
                    🗑
                  </button>
                </div>
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
        </>)}
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <BusinessSetupChat key={activeSession ?? sessionKey} sessionId={activeSession ?? undefined} />
      </div>
    </div>
  );
}
