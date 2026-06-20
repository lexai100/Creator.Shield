"use client";

/**
 * BusinessSetupChat — Two-panel layout
 * Left: chat with numbered step bubbles + file upload
 * Right: live updating checklist sidebar with Indian Kanoon links
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { BusinessSetupMessage, BusinessChecklistItem } from "@/lib/api";
import { businessSetupChat } from "@/lib/api";
import { saveConversation, saveMessage, newId } from "@/lib/db";

// ── Helpers ───────────────────────────────────────────────────────────────

function formatAIReply(text: string) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let stepCounter = 0;

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) { elements.push(<br key={`br-${i}`} />); return; }

    // Detect numbered steps: "1.", "2.", "1)", "2)" etc.
    const stepMatch = trimmed.match(/^(\d+)[.)]\s+(.+)/);
    if (stepMatch) {
      stepCounter++;
      // strip any ** bold markers from the step text
      const stepText = stepMatch[2].replace(/\*\*([^*]+)\*\*/g, '$1');
      elements.push(
        <div key={`step-${i}`} className="biz-step">
          <span className="biz-step-num">{stepCounter}</span>
          <span className="biz-step-text">{stepText}</span>
        </div>
      );
      return;
    }

    // Detect bold markers **text**
    const parts = trimmed.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    elements.push(<p key={`p-${i}`} className="mb-1">{parts}</p>);
  });

  return <>{elements}</>;
}

function getPriorityClass(priority: string) {
  if (priority === "required") return "biz-priority-required";
  if (priority === "recommended") return "biz-priority-recommended";
  return "biz-priority-optional";
}

function getPriorityLabel(priority: string) {
  if (priority === "required") return "🔴 Required";
  if (priority === "recommended") return "🟡 Recommended";
  return "🔵 Optional";
}

function getKanoonUrl(licenseName: string) {
  const query = encodeURIComponent(licenseName + " India registration act");
  return `https://indiankanoon.org/search/?formInput=${query}`;
}

// ── Types ─────────────────────────────────────────────────────────────────

interface ChecklistItemWithState extends BusinessChecklistItem {
  done: boolean;
  expanded: boolean;
}

// ── ChecklistItem Component ───────────────────────────────────────────────

function ChecklistCard({
  item,
  onToggleDone,
  onToggleExpand,
}: {
  item: ChecklistItemWithState;
  onToggleDone: () => void;
  onToggleExpand: () => void;
}) {
  return (
    <div
      className={`biz-checklist-item ${item.done ? "done" : ""}`}
      onClick={onToggleExpand}
    >
      <div className="biz-checklist-item-top">
        <button
          className="biz-checklist-checkbox"
          onClick={(e) => { e.stopPropagation(); onToggleDone(); }}
          title={item.done ? "Mark as pending" : "Mark as done"}
        >
          {item.done ? "✓" : ""}
        </button>
        <div className="biz-checklist-item-info">
          <p className="biz-checklist-name">{item.license_name}</p>
          <p className="biz-checklist-auth">{item.issuing_authority}</p>
        </div>
        <span className={getPriorityClass(item.priority)}>
          {item.priority}
        </span>
      </div>

      {/* Cost + timeline pills */}
      {(item.estimated_cost || item.timeline) && (
        <div className="biz-checklist-meta-row">
          {item.estimated_cost && (
            <span className="biz-checklist-meta-pill">
              💰 {item.estimated_cost}
            </span>
          )}
          {item.timeline && (
            <span className="biz-checklist-meta-pill">
              ⏱ {item.timeline}
            </span>
          )}
        </div>
      )}

      {/* Expanded detail */}
      {item.expanded && (
        <div className="biz-checklist-details" onClick={(e) => e.stopPropagation()}>
          {item.when_required && (
            <div className="biz-checklist-detail-row">
              <span className="biz-checklist-detail-label">When you need it</span>
              <span className="biz-checklist-detail-value">{item.when_required}</span>
            </div>
          )}
          {item.how_to_apply && (
            <div className="biz-checklist-detail-row">
              <span className="biz-checklist-detail-label">How to apply</span>
              <span className="biz-checklist-detail-value">{item.how_to_apply}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-1">
            {item.portal_url && (
              <a
                href={item.portal_url}
                target="_blank"
                rel="noopener noreferrer"
                className="biz-checklist-link"
              >
                🌐 Official Portal ↗
              </a>
            )}
            <a
              href={getKanoonUrl(item.license_name)}
              target="_blank"
              rel="noopener noreferrer"
              className="biz-kanoon-link"
            >
              ⚖️ Indian Kanoon ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

const STORAGE_KEY = "cs_business_chat_v1";

function loadSavedSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSession(data: {
  messages: BusinessSetupMessage[];
  checklist: ChecklistItemWithState[];
  sessionId: string;
  progress: number;
}) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

const INITIAL_MESSAGE: BusinessSetupMessage = {
  role: "assistant",
  content:
    "Hi! I'm your Business Setup Guide 👋\n\nI'll help you figure out exactly which registrations and licences you need as a content creator in India — step by step, in simple language.\n\nTo get started: What kind of content do you make, and are you selling any products or services alongside it?",
};

export default function BusinessSetupChat() {
  const saved = loadSavedSession();

  const [messages, setMessages] = useState<BusinessSetupMessage[]>(
    saved?.messages?.length ? saved.messages : [INITIAL_MESSAGE]
  );
  const [checklist, setChecklist] = useState<ChecklistItemWithState[]>(
    saved?.checklist ?? []
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(saved?.progress ?? 0);
  const [sessionId] = useState<string>(() => saved?.sessionId ?? `biz_${Date.now()}`);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  // stable conversation id for this session
  const [convId] = useState(() => saved?.sessionId ?? newId("biz"));

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Persist to localStorage whenever messages/checklist/progress change
  useEffect(() => {
    saveSession({ messages, checklist, sessionId, progress });
  }, [messages, checklist, sessionId, progress]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  }, [input]);

  const handleClearChat = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([INITIAL_MESSAGE]);
    setChecklist([]);
    setProgress(0);
    setShowClearConfirm(false);
  };

  const mergeChecklist = useCallback((newItems: BusinessChecklistItem[]) => {
    setChecklist((prev) => {
      const existingNames = new Set(prev.map((i) => i.license_name));
      const toAdd = newItems
        .filter((ni) => !existingNames.has(ni.license_name))
        .map((ni) => ({ ...ni, done: false, expanded: false }));
      // Update existing items with fresh data
      const updated = prev.map((pi) => {
        const match = newItems.find((ni) => ni.license_name === pi.license_name);
        return match ? { ...pi, ...match } : pi;
      });
      return [...updated, ...toAdd];
    });
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text && !attachedFile) return;
    if (isLoading) return;

    let userContent = text;
    if (attachedFile) {
      userContent = `[Uploaded document: ${attachedFile.name}]\n\n${text}`;
    }

    const userMsg: BusinessSetupMessage = { role: "user", content: userContent };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachedFile(null);
    setIsLoading(true);

    try {
      const response = await businessSetupChat({
        session_id: sessionId,
        message: userContent,
        conversation_history: [...messages, userMsg],
      });

      setProgress(response.progress_percent ?? 0);

      const aiMsg: BusinessSetupMessage = { role: "assistant", content: response.reply };
      setMessages((prev) => [...prev, aiMsg]);

      if (response.checklist && response.checklist.length > 0) {
        mergeChecklist(response.checklist);
      }

      // Persist to Supabase
      const title = messages.filter(m => m.role === "user")[0]?.content.slice(0, 60) ?? "Business Setup Session";
      await saveConversation({ id: convId, title, type: "business", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), starred: false, messageCount: messages.length + 2 });
      await saveMessage({ conversationId: convId, role: "user", content: userContent });
      await saveMessage({ conversationId: convId, role: "assistant", content: response.reply });
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I ran into a connection issue. Please try again in a moment!",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAttachedFile(file);
  };

  const toggleDone = (idx: number) => {
    setChecklist((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, done: !item.done } : item
      )
    );
  };

  const toggleExpand = (idx: number) => {
    setChecklist((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, expanded: !item.expanded } : item
      )
    );
  };

  const doneCount = checklist.filter((i) => i.done).length;

  return (
    <div className="biz-layout">
      {/* ── LEFT: Chat Panel ── */}
      <div className="biz-chat-panel">
        {/* Header */}
        <div className="biz-chat-header">
          <div className="biz-chat-avatar">🏢</div>
          <div className="flex-1">
            <div className="biz-chat-title">Business Setup Guide</div>
            <div className="biz-chat-subtitle">
              Personalised licences &amp; registrations for Indian creators
            </div>
          </div>
          {progress > 0 && (
            <div
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{
                background: "rgba(212,130,26,0.15)",
                color: "var(--color-lexai-accent-glow)",
                border: "1px solid rgba(212,130,26,0.3)",
              }}
            >
              {progress}% done
            </div>
          )}
          {/* Clear chat button */}
          {messages.length > 1 && (
            <div style={{ position: "relative" }}>
              {showClearConfirm ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-lexai-text-muted)" }}>Clear chat?</span>
                  <button
                    onClick={handleClearChat}
                    style={{ fontSize: "0.72rem", padding: "3px 8px", borderRadius: 6, background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer" }}
                  >Yes</button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    style={{ fontSize: "0.72rem", padding: "3px 8px", borderRadius: 6, background: "transparent", color: "var(--color-lexai-text-muted)", border: "1px solid var(--color-lexai-border)", cursor: "pointer" }}
                  >No</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  title="Clear chat history"
                  style={{ fontSize: "0.7rem", padding: "4px 10px", borderRadius: 8, background: "transparent", color: "var(--color-lexai-text-muted)", border: "1px solid var(--color-lexai-border)", cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  🗑 Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="biz-progress-bar">
          <div className="biz-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Messages */}
        <div className="biz-messages">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`biz-msg-row ${msg.role === "user" ? "user" : ""}`}
            >
              <div
                className={`biz-msg-avatar ${msg.role === "user" ? "user" : "ai"}`}
              >
                {msg.role === "user" ? "👤" : "🤖"}
              </div>
              <div className={`biz-bubble ${msg.role === "user" ? "user" : "ai"}`}>
                {msg.role === "assistant"
                  ? formatAIReply(msg.content)
                  : msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="biz-msg-row">
              <div className="biz-msg-avatar ai">🤖</div>
              <div className="biz-typing">
                <div className="biz-typing-dot" />
                <div className="biz-typing-dot" />
                <div className="biz-typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="biz-input-area">
          {/* Attached file chip */}
          {attachedFile && (
            <div className="biz-file-chip">
              <span>📎</span>
              <span className="flex-1 truncate">{attachedFile.name}</span>
              <button
                className="biz-file-chip-remove"
                onClick={() => setAttachedFile(null)}
              >
                ✕
              </button>
            </div>
          )}

          <div className="biz-input-row">
            {/* Attach button */}
            <button
              className="biz-input-attach"
              onClick={() => fileInputRef.current?.click()}
              title="Upload a document (contract, registration cert…)"
            >
              ＋
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.jpg,.png"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {/* Text input */}
            <textarea
              ref={textareaRef}
              className="biz-input-field"
              placeholder="Tell me about your business… (Shift+Enter for new line)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
            />

            {/* Send button */}
            <button
              className="biz-input-send"
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && !attachedFile)}
              title="Send"
            >
              ➤
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Checklist Sidebar ── */}
      <div className="biz-checklist-panel">
        <div className="biz-checklist-header">
          <div className="biz-checklist-title">
            📋 Your Licence Checklist
            {checklist.length > 0 && (
              <span
                className="ml-auto text-xs font-normal px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(212,130,26,0.15)",
                  color: "var(--color-lexai-accent-glow)",
                  border: "1px solid rgba(212,130,26,0.2)",
                }}
              >
                {doneCount}/{checklist.length}
              </span>
            )}
          </div>
          <div className="biz-checklist-subtitle">
            Updates automatically as you chat · Click to expand · Tick when done
          </div>

          {/* Priority legend */}
          {checklist.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-8px" style={{ marginTop: "8px" }}>
              <span className="biz-priority-required">required</span>
              <span className="biz-priority-recommended">recommended</span>
              <span className="biz-priority-optional">optional</span>
            </div>
          )}
        </div>

        <div className="biz-checklist-body">
          {checklist.length === 0 ? (
            <div className="biz-checklist-empty">
              <div className="biz-checklist-empty-icon">📋</div>
              <div className="biz-checklist-empty-text">
                Your personalised checklist will appear here as we chat.
                <br /><br />
                Each item will have the official portal link and an Indian Kanoon reference.
              </div>
            </div>
          ) : (
            checklist.map((item, idx) => (
              <ChecklistCard
                key={`${item.license_name}-${idx}`}
                item={item}
                onToggleDone={() => toggleDone(idx)}
                onToggleExpand={() => toggleExpand(idx)}
              />
            ))
          )}
        </div>

        {/* Footer quick actions */}
        {checklist.length > 0 && (
          <div
            style={{
              padding: "12px 14px",
              borderTop: "1px solid var(--color-lexai-border)",
              background: "var(--color-lexai-surface-2)",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn-secondary"
              style={{ fontSize: "0.72rem", padding: "6px 12px", borderRadius: "8px" }}
              onClick={() => {
                const lines = checklist.map(
                  (i) => `[${i.done ? "x" : " "}] ${i.license_name} (${i.priority}) — ${i.portal_url || ""}`
                );
                const blob = new Blob([lines.join("\n")], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "creatorshield-checklist.txt";
                a.click();
              }}
            >
              ⬇ Download List
            </button>
            <button
              className="btn-secondary"
              style={{ fontSize: "0.72rem", padding: "6px 12px", borderRadius: "8px" }}
              onClick={() => setChecklist((prev) => prev.map((i) => ({ ...i, done: false })))}
            >
              ↺ Reset Ticks
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
