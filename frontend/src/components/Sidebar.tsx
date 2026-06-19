"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getConversations, getProfile, type CSConversation } from "@/lib/store";

// ── Nav item definitions ──────────────────────────────────────────────────────

interface NavItem {
  label: string;
  icon: string;
  href: string;
  badge?: string;
}

const TOP_ITEMS: NavItem[] = [
  { label: "Dashboard",          icon: "⊞", href: "/dashboard" },
  { label: "New Chat",           icon: "✦", href: "/chat" },
];

const FEATURE_ITEMS: NavItem[] = [
  { label: "Check My Contract",  icon: "🛡️", href: "/check" },
  { label: "Write a Contract",   icon: "✍️", href: "/generate" },
  { label: "Set Up My Business", icon: "🏢", href: "/business" },
  { label: "Negotiate with Brands", icon: "📧", href: "/negotiate" },
];

const DOC_ITEMS: NavItem[] = [
  { label: "Documents",          icon: "📄", href: "/docs/documents" },
  { label: "Notes",              icon: "📝", href: "/docs/notes" },
];

const BOTTOM_ITEMS: NavItem[] = [
  { label: "Settings",           icon: "⚙️", href: "/settings" },
  { label: "Help",               icon: "❓", href: "/help" },
];

// ── Sidebar component ─────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [recentChats, setRecentChats] = useState<CSConversation[]>([]);
  const [chatsOpen, setChatsOpen] = useState(true);
  const [profile, setProfile] = useState<{ name: string } | null>(null);

  useEffect(() => {
    setRecentChats(getConversations().slice(0, 6));
    const p = getProfile();
    if (p) setProfile(p);
  }, [pathname]); // refresh on route change

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const itemClass = (href: string) =>
    `sidebar-item ${isActive(href) ? "active" : ""}`;

  return (
    <aside
      style={{
        width: collapsed ? 64 : 240,
        minWidth: collapsed ? 64 : 240,
        transition: "width 0.25s ease, min-width 0.25s ease",
        background: "var(--color-lexai-surface)",
        borderRight: "1px solid var(--color-lexai-border)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        overflowX: "hidden",
        overflowY: "auto",
        zIndex: 50,
        userSelect: "none",
      }}
    >
      {/* ── Logo ── */}
      <div
        className="sidebar-logo"
        onClick={() => router.push("/")}
        title="Back to Home"
        style={{ cursor: "pointer" }}
      >
        <span className="sidebar-logo-icon">🛡️</span>
        {!collapsed && (
          <span className="sidebar-logo-text">
            Creator<span style={{ color: "var(--color-lexai-accent)" }}>Shield</span>
          </span>
        )}
      </div>

      {/* ── Profile chip ── */}
      {!collapsed && profile && (
        <div style={{ padding: "0 14px 12px" }}>
          <div style={{
            background: "var(--color-lexai-surface-2)",
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: "0.78rem",
            color: "var(--color-lexai-text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(212,130,26,0.2)",
              color: "var(--color-lexai-accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: "0.9rem", flexShrink: 0,
            }}>
              {profile.name[0]?.toUpperCase()}
            </span>
            <span style={{ fontWeight: 600, color: "var(--color-lexai-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {profile.name}
            </span>
          </div>
        </div>
      )}

      {/* ── Top nav ── */}
      <nav style={{ flex: 1, padding: "0 8px" }}>
        {TOP_ITEMS.map(item => (
          <button
            key={item.href}
            className={itemClass(item.href)}
            onClick={() => router.push(item.href)}
            title={collapsed ? item.label : undefined}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
          </button>
        ))}

        {/* ── My Chats ── */}
        {!collapsed && (
          <>
            <button
              className="sidebar-section-header"
              onClick={() => setChatsOpen(o => !o)}
            >
              <span>💬 My Chats</span>
              <span style={{ fontSize: "0.65rem", opacity: 0.6 }}>{chatsOpen ? "▲" : "▼"}</span>
            </button>
            {chatsOpen && recentChats.length > 0 && (
              <div style={{ marginBottom: 4 }}>
                {recentChats.map(c => (
                  <button
                    key={c.id}
                    className={`sidebar-item sub ${isActive(`/chat/${c.id}`) ? "active" : ""}`}
                    onClick={() => router.push(`/chat/${c.id}`)}
                    title={c.title}
                  >
                    <span className="sidebar-item-icon" style={{ fontSize: "0.7rem" }}>
                      {c.type === "check" ? "🛡️" : c.type === "generate" ? "✍️" : "💬"}
                    </span>
                    <span className="sidebar-item-label" style={{
                      overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap", fontSize: "0.78rem",
                    }}>
                      {c.title}
                    </span>
                  </button>
                ))}
                <button
                  className="sidebar-item sub"
                  onClick={() => router.push("/chat")}
                  style={{ color: "var(--color-lexai-accent)", fontSize: "0.75rem" }}
                >
                  <span className="sidebar-item-icon" style={{ fontSize: "0.7rem" }}>＋</span>
                  <span className="sidebar-item-label">All Chats</span>
                </button>
              </div>
            )}
            {chatsOpen && recentChats.length === 0 && (
              <p style={{ fontSize: "0.72rem", color: "var(--color-lexai-text-muted)", padding: "4px 12px 8px", opacity: 0.7 }}>
                No chats yet
              </p>
            )}
          </>
        )}

        {/* ── Features section ── */}
        {!collapsed && <div className="sidebar-section-label">Features</div>}
        {collapsed && <div style={{ height: 8 }} />}
        {FEATURE_ITEMS.map(item => (
          <button
            key={item.href}
            className={itemClass(item.href)}
            onClick={() => router.push(item.href)}
            title={collapsed ? item.label : undefined}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
          </button>
        ))}

        {/* ── My Docs section ── */}
        {!collapsed && <div className="sidebar-section-label">My Docs</div>}
        {DOC_ITEMS.map(item => (
          <button
            key={item.href}
            className={itemClass(item.href)}
            onClick={() => router.push(item.href)}
            title={collapsed ? item.label : undefined}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* ── Bottom ── */}
      <div style={{ padding: "8px 8px 6px", borderTop: "1px solid var(--color-lexai-border)" }}>
        {BOTTOM_ITEMS.map(item => (
          <button
            key={item.href}
            className={itemClass(item.href)}
            onClick={() => router.push(item.href)}
            title={collapsed ? item.label : undefined}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
          </button>
        ))}

        {/* ── Collapse toggle ── */}
        <button
          className="sidebar-item"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{ marginTop: 2 }}
        >
          <span className="sidebar-item-icon">{collapsed ? "→" : "←"}</span>
          {!collapsed && <span className="sidebar-item-label">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
