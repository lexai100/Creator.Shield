"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getConversations, saveConversation, newId, type CSConversation } from "@/lib/store";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://creatorshield.onrender.com";

const SAMPLE_QUESTIONS = [
  "Can I legally call out a brand that scammed me?",
  "Is my brand deal contract safe to sign?",
  "A brand wants exclusive rights — what does that mean?",
  "What licences do I need to monetise my content in India?",
  "Can a brand sue me for a negative honest review?",
  "How do I protect my content from being used without permission?",
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function generalChat(messages: ChatMessage[]): Promise<string> {
  // Use the business setup endpoint but with a legal-general system context,
  // or fall back to a simple fetch if a dedicated general endpoint exists.
  const last = messages[messages.length - 1];
  const res = await fetch(`${API_BASE}/api/business-setup/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: "general_" + Date.now(),
      message: last.content,
      conversation_history: messages.slice(0, -1).map(m => ({
        role: m.role,
        content: m.content,
      })),
      // Override context to general legal chat
      context: "general_legal",
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return data.reply ?? data.message ?? "I couldn't process that. Please try again.";
}

function ChatInner() {
  const router = useRouter();
  const params = useSearchParams();
  const convIdParam = params.get("id");
  const qParam = params.get("q");

  const [input, setInput] = useState(qParam ?? "");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sampleIdx, setSampleIdx] = useState(0);
  const [convId] = useState(() => convIdParam ?? newId("conv"));
  const [convTitle, setConvTitle] = useState("New chat");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoSentRef = useRef(false);

  // Load existing conversation messages from localStorage if ?id= is provided
  useEffect(() => {
    if (convIdParam) {
      const saved = getConversations().find(c => c.id === convIdParam);
      if (saved) setConvTitle(saved.title);
      // Note: message bodies aren't stored (only metadata) — show a friendly note
      setMessages([{
        role: "assistant",
        content: "Welcome back! I can see your previous session. How can I help you continue?",
      }]);
    }
  }, [convIdParam]);

  // Cycle sample questions
  useEffect(() => {
    const t = setInterval(() => setSampleIdx(i => (i + 1) % SAMPLE_QUESTIONS.length), 3000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; }
  }, [input]);

  // Auto-send if ?q= param
  useEffect(() => {
    if (qParam && !autoSentRef.current) {
      autoSentRef.current = true;
      sendMessage(qParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const reply = await generalChat(newMessages);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);

      // Save conversation metadata
      const title = messages.length === 0 ? text.trim().slice(0, 60) : convTitle;
      setConvTitle(title);
      const conv: CSConversation = {
        id: convId,
        title,
        type: "general",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        starred: false,
        messageCount: newMessages.length + 1,
      };
      saveConversation(conv);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I ran into an issue. Please try again!" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)" }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>💬</div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", fontWeight: 800, marginBottom: 8 }}>
              Hi! How can I help you today?
            </h2>
            <p style={{ color: "var(--color-lexai-text-muted)", marginBottom: 32, fontSize: "0.9rem" }}>
              Ask me anything about contracts, creator rights, or legal protection.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 600, margin: "0 auto 32px" }}>
              {[SAMPLE_QUESTIONS[sampleIdx], SAMPLE_QUESTIONS[(sampleIdx + 1) % SAMPLE_QUESTIONS.length], SAMPLE_QUESTIONS[(sampleIdx + 2) % SAMPLE_QUESTIONS.length]].map((q, i) => (
                <button
                  key={`${sampleIdx}-${i}`}
                  onClick={() => sendMessage(q)}
                  style={{
                    padding: "10px 16px", borderRadius: 24,
                    border: "1px solid var(--color-lexai-border)",
                    background: "var(--color-lexai-surface-2)",
                    color: "var(--color-lexai-text)", fontSize: "0.82rem",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-lexai-accent)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-lexai-border)"; }}
                >
                  {q}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { icon: "🛡️", label: "Check a Contract", href: "/check" },
                { icon: "✍️", label: "Write a Contract", href: "/generate" },
                { icon: "🏢", label: "Set Up My Business", href: "/business" },
                { icon: "📧", label: "Negotiate with a Brand", href: "/negotiate" },
              ].map(a => (
                <button
                  key={a.href}
                  onClick={() => router.push(a.href)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 18px", borderRadius: 12,
                    border: "1px solid var(--color-lexai-border)",
                    background: "transparent",
                    color: "var(--color-lexai-text-muted)",
                    fontSize: "0.82rem", cursor: "pointer", transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "var(--color-lexai-surface-2)"; el.style.color = "var(--color-lexai-text)"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "transparent"; el.style.color = "var(--color-lexai-text-muted)"; }}
                >
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 20, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                  background: msg.role === "user" ? "rgba(212,130,26,0.15)" : "rgba(255,255,255,0.05)",
                  border: `1.5px solid ${msg.role === "user" ? "var(--color-lexai-accent)" : "var(--color-lexai-border)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem",
                }}>
                  {msg.role === "user" ? "👤" : "🛡️"}
                </div>
                <div style={{
                  maxWidth: "78%",
                  background: msg.role === "user" ? "rgba(212,130,26,0.08)" : "var(--color-lexai-surface-2)",
                  border: `1px solid ${msg.role === "user" ? "rgba(212,130,26,0.2)" : "var(--color-lexai-border)"}`,
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  padding: "12px 16px", fontSize: "0.88rem", lineHeight: 1.7,
                  color: "var(--color-lexai-text)", whiteSpace: "pre-wrap",
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1.5px solid var(--color-lexai-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>🛡️</div>
                <div style={{ background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: "18px 18px 18px 4px", padding: "14px 18px", display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-lexai-accent)", display: "inline-block", animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: "16px 24px 20px", borderTop: "1px solid var(--color-lexai-border)", background: "var(--color-lexai-surface)" }}>
        <form onSubmit={handleSubmit} style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ position: "relative" }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Type your question… (Enter to send, Shift+Enter for new line)"
              rows={1}
              disabled={loading}
              style={{
                width: "100%", background: "var(--color-lexai-surface-2)",
                border: "1.5px solid var(--color-lexai-border)", borderRadius: 14,
                padding: "12px 54px 12px 16px", fontSize: "0.9rem",
                color: "var(--color-lexai-text)", resize: "none", outline: "none",
                transition: "border-color 0.2s", fontFamily: "var(--font-body)",
              }}
              onFocus={e => { (e.target as HTMLElement).style.borderColor = "var(--color-lexai-accent)"; }}
              onBlur={e => { (e.target as HTMLElement).style.borderColor = "var(--color-lexai-border)"; }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                position: "absolute", right: 10, bottom: 10,
                width: 34, height: 34, borderRadius: "50%",
                background: input.trim() && !loading ? "var(--color-lexai-accent)" : "var(--color-lexai-surface)",
                border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1rem", color: "#0d0b08", transition: "all 0.2s",
              }}
            >
              ↑
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: "0.7rem", color: "var(--color-lexai-text-muted)", marginTop: 8, opacity: 0.7 }}>
            Your conversations are private.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "var(--color-lexai-text-muted)" }}>
        Loading…
      </div>
    }>
      <ChatInner />
    </Suspense>
  );
}
