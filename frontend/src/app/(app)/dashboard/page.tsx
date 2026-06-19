"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStats, getConversations, getProfile, toggleStarConversation, type CSConversation } from "@/lib/store";

const TIPS = [
  "Always read the payment clause — check if 'net 30' means 30 days from invoice or 30 days from brand's approval.",
  "Exclusivity clauses can ban you from working with competitors — even for unpaid posts. Read the scope carefully.",
  "An 'in perpetuity' license means the brand can use your content forever. Always add an expiry date.",
  "If a brand ghosts you after delivery, a clear kill-fee clause ensures you still get paid.",
  "Whitelisting allows brands to run paid ads using your handle. Make sure it's time-limited and compensated.",
  "Indian copyright law gives creators moral rights — you can object if your content is used in a misleading way.",
];

function StatCard({ icon, label, value, sub, onClick }: { icon: string; label: string; value: string | number; sub?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--color-lexai-surface-2)",
        border: "1px solid var(--color-lexai-border)",
        borderRadius: 16,
        padding: "20px 24px",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s",
        flex: 1,
        minWidth: 140,
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.borderColor = "var(--color-lexai-accent)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-lexai-border)"; }}
    >
      <div style={{ fontSize: "1.6rem", marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: "1.8rem", fontWeight: 800, fontFamily: "var(--font-heading)", color: "var(--color-lexai-text)" }}>{value}</div>
      <div style={{ fontSize: "0.8rem", color: "var(--color-lexai-text-muted)", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: "0.72rem", color: "var(--color-lexai-accent)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({ totalChats: 0, documents: 0, notes: 0, storageMB: "0.00" });
  const [convs, setConvs] = useState<CSConversation[]>([]);
  const [starred, setStarred] = useState<CSConversation[]>([]);
  const [tipIdx] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [tipDismissed, setTipDismissed] = useState(false);
  const [greeting, setGreeting] = useState("Hello");
  const [name, setName] = useState("Creator");

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
    const p = getProfile();
    if (p) setName(p.name);
    const all = getConversations();
    setConvs(all.slice(0, 5));
    setStarred(all.filter(c => c.starred).slice(0, 4));
    setStats(getStats());
  }, []);

  const handleStar = (id: string) => {
    toggleStarConversation(id);
    const all = getConversations();
    setConvs(all.slice(0, 5));
    setStarred(all.filter(c => c.starred).slice(0, 4));
  };

  const convIcon = (type: string) =>
    type === "check" ? "🛡️" : type === "generate" ? "✍️" : type === "general" ? "💬" : "📋";

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 900, margin: 0 }}>
            {greeting}, <span style={{ color: "var(--color-lexai-accent)" }}>{name}!</span>
          </h1>
          <p style={{ color: "var(--color-lexai-text-muted)", marginTop: 4, fontSize: "0.9rem" }}>
            Welcome to your CreatorShield dashboard
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" onClick={() => router.push("/check")}>
            🛡️ Check a Contract
          </button>
          <button className="btn-primary" onClick={() => router.push("/chat")}>
            ✦ New Chat
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard icon="💬" label="Total Chats" value={stats.totalChats} onClick={() => router.push("/chat")} />
        <StatCard icon="📄" label="Documents" value={stats.documents} onClick={() => router.push("/docs/documents")} />
        <StatCard icon="📝" label="Notes" value={stats.notes} onClick={() => router.push("/docs/notes")} />
        <StatCard icon="💾" label="Storage Used" value={`${stats.storageMB} MB`} sub="of local storage" />
      </div>

      {/* Tip of the day */}
      {!tipDismissed && (
        <div style={{
          background: "rgba(212,130,26,0.08)",
          border: "1px solid rgba(212,130,26,0.25)",
          borderRadius: 14,
          padding: "14px 18px",
          marginBottom: 24,
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}>
          <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>💡</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-lexai-accent)", marginBottom: 3 }}>Creator Tip of the Day</p>
            <p style={{ fontSize: "0.85rem", color: "var(--color-lexai-text)", lineHeight: 1.6 }}>{TIPS[tipIdx]}</p>
          </div>
          <button onClick={() => setTipDismissed(true)} style={{ background: "none", border: "none", color: "var(--color-lexai-text-muted)", cursor: "pointer", fontSize: "1rem", padding: 4 }}>✕</button>
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Recent Chats */}
        <div style={{ background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem", margin: 0 }}>🕐 Recent Chats</h3>
            <button onClick={() => router.push("/chat")} style={{ fontSize: "0.75rem", color: "var(--color-lexai-accent)", background: "none", border: "none", cursor: "pointer" }}>
              View All →
            </button>
          </div>
          {convs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--color-lexai-text-muted)", fontSize: "0.85rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>💬</div>
              No chats yet — start one below!
            </div>
          ) : (
            convs.map(c => (
              <div
                key={c.id}
                onClick={() => router.push(`/chat/${c.id}`)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                  transition: "background 0.15s", marginBottom: 4,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span style={{ fontSize: "1rem", flexShrink: 0 }}>{convIcon(c.type)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: "0.83rem", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</p>
                  <p style={{ fontSize: "0.72rem", color: "var(--color-lexai-text-muted)", margin: 0 }}>{timeAgo(c.updatedAt)} · {c.messageCount} messages</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleStar(c.id); }}
                  style={{ background: "none", border: "none", fontSize: "0.9rem", cursor: "pointer", opacity: c.starred ? 1 : 0.4 }}
                >
                  {c.starred ? "⭐" : "☆"}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Starred Chats */}
        <div style={{ background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 16, padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem", margin: "0 0 16px" }}>⭐ Saved Chats</h3>
          {starred.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>⭐</div>
              <p style={{ color: "var(--color-lexai-text-muted)", fontSize: "0.82rem" }}>
                Click the star on any conversation to save it here for quick access.
              </p>
            </div>
          ) : (
            starred.map(c => (
              <div key={c.id} onClick={() => router.push(`/chat/${c.id}`)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, cursor: "pointer", marginBottom: 4, transition: "background 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span style={{ fontSize: "1rem" }}>{convIcon(c.type)}</span>
                <p style={{ fontWeight: 600, fontSize: "0.83rem", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</p>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 16, padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem", margin: "0 0 16px" }}>⚡ Quick Actions</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { icon: "🛡️", label: "Check My Contract", desc: "Upload & analyse", href: "/check", color: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.2)" },
              { icon: "✍️", label: "Write a Contract", desc: "Generate in seconds", href: "/generate", color: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.2)" },
              { icon: "🏢", label: "Business Setup", desc: "AI guided checklist", href: "/business", color: "rgba(212,130,26,0.1)", border: "rgba(212,130,26,0.2)" },
              { icon: "📧", label: "Negotiate", desc: "Draft brand emails", href: "/negotiate", color: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.2)" },
            ].map(a => (
              <div key={a.href} onClick={() => router.push(a.href)} style={{ background: a.color, border: `1px solid ${a.border}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "transform 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; }}
              >
                <div style={{ fontSize: "1.3rem", marginBottom: 6 }}>{a.icon}</div>
                <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>{a.label}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--color-lexai-text-muted)", marginTop: 2 }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Account Status */}
        <div style={{ background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 16, padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem", margin: "0 0 16px" }}>🔐 Account Status</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.83rem" }}>
              <span style={{ color: "var(--color-lexai-text-muted)" }}>Current Plan</span>
              <span style={{ fontWeight: 700, color: "var(--color-lexai-accent)" }}>Free</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.83rem" }}>
              <span style={{ color: "var(--color-lexai-text-muted)" }}>Data Storage</span>
              <span style={{ fontWeight: 600 }}>Local (private)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.83rem" }}>
              <span style={{ color: "var(--color-lexai-text-muted)" }}>Conversations</span>
              <span style={{ fontWeight: 600 }}>{stats.totalChats}</span>
            </div>
            <div style={{ height: 1, background: "var(--color-lexai-border)" }} />
            <p style={{ fontSize: "0.75rem", color: "var(--color-lexai-text-muted)", lineHeight: 1.5 }}>
              🔒 All your conversations and documents are stored locally on your device. Nothing is shared externally.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
