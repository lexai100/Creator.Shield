"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  businessSetupChat,
  type BusinessSetupMessage,
  type BusinessSetupResponse,
  type BusinessChecklistItem,
} from "@/lib/api";

const GREETING = `👋 Hi! I'm **CreatorShield's Business Setup Assistant**.

Tell me about your creator business and I'll guide you step-by-step through everything you need to set up legally in India — GST, MSME registration, FSSAI, trademark, and more.

What does your creator business look like?`;

const PRIORITY_CONFIG = {
  required: {
    label: "Required",
    bg: "rgba(239,68,68,0.15)",
    border: "rgba(239,68,68,0.4)",
    text: "#f87171",
    dot: "#ef4444",
  },
  recommended: {
    label: "Recommended",
    bg: "rgba(245,158,11,0.15)",
    border: "rgba(245,158,11,0.4)",
    text: "#fbbf24",
    dot: "#f59e0b",
  },
  optional: {
    label: "Optional",
    bg: "rgba(99,102,241,0.15)",
    border: "rgba(99,102,241,0.4)",
    text: "#a78bfa",
    dot: "#6366f1",
  },
};

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 16px" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "rgba(251,191,36,0.7)",
            animation: `typing-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function ChatBubble({
  msg,
  isUser,
}: {
  msg: BusinessSetupMessage;
  isUser: boolean;
}) {
  // Parse bold markdown **text**
  const formatted = msg.content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 12,
        animation: "fadeSlideIn 0.3s ease-out",
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            flexShrink: 0,
            marginRight: 10,
            marginTop: 2,
          }}
        >
          🤖
        </div>
      )}
      <div
        style={{
          maxWidth: "75%",
          padding: "12px 16px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isUser
            ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
            : "rgba(255,255,255,0.06)",
          border: isUser ? "none" : "1px solid rgba(255,255,255,0.1)",
          color: isUser ? "#fff" : "rgba(255,255,255,0.9)",
          fontSize: 14,
          lineHeight: 1.6,
          boxShadow: isUser
            ? "0 4px 20px rgba(124,58,237,0.3)"
            : "0 2px 8px rgba(0,0,0,0.2)",
        }}
        dangerouslySetInnerHTML={{ __html: formatted }}
      />
      {isUser && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            flexShrink: 0,
            marginLeft: 10,
            marginTop: 2,
          }}
        >
          👤
        </div>
      )}
    </div>
  );
}

function ChecklistCard({ item }: { item: BusinessChecklistItem }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.optional;

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 12,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: cfg.dot,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>
              {item.license_name}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
              {item.issuing_authority}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: cfg.text,
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              padding: "3px 8px",
              borderRadius: 20,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {cfg.label}
          </span>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 18, lineHeight: 1 }}>
            {expanded ? "↑" : "↓"}
          </span>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <InfoRow label="When Required" value={item.when_required} />
            <InfoRow label="Estimated Cost" value={item.estimated_cost} />
            <InfoRow label="Timeline" value={item.timeline} />
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
              HOW TO APPLY
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
              {item.how_to_apply}
            </div>
          </div>
          {item.portal_url && (
            <a
              href={item.portal_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 12,
                fontSize: 12,
                color: "#fbbf24",
                fontWeight: 600,
                textDecoration: "none",
                padding: "6px 12px",
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: 8,
              }}
            >
              🔗 Visit Official Portal
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: 4,
        background: "rgba(255,255,255,0.08)",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${percent}%`,
          background: "linear-gradient(90deg, #f59e0b, #7c3aed)",
          borderRadius: 2,
          transition: "width 0.5s ease",
        }}
      />
    </div>
  );
}

export default function BusinessSetupChat() {
  const [messages, setMessages] = useState<BusinessSetupMessage[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2));
  const [finalChecklist, setFinalChecklist] = useState<BusinessChecklistItem[] | null>(null);
  const [progress, setProgress] = useState(5);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: BusinessSetupMessage = { role: "user", content: text };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput("");
    setIsLoading(true);

    try {
      const response: BusinessSetupResponse = await businessSetupChat({
        session_id: sessionId,
        message: text,
        conversation_history: messages,
      });

      const assistantMsg: BusinessSetupMessage = {
        role: "assistant",
        content: response.reply,
      };
      setMessages([...updatedHistory, assistantMsg]);
      setProgress(response.progress_percent || progress);

      if (response.is_final && response.checklist) {
        setFinalChecklist(response.checklist);
      }
    } catch (err) {
      const errMsg: BusinessSetupMessage = {
        role: "assistant",
        content: "⚠️ I hit a technical issue. Please try again in a moment!",
      };
      setMessages([...updatedHistory, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, sessionId, progress]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, height: "100%" }}>
      {/* Header */}
      <div
        style={{
          background: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.2)",
          borderRadius: 16,
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
          }}
        >
          🏢
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, color: "#fff", fontSize: 18 }}>
            Business Setup Assistant
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
            Personalised Indian business registration guidance for creators
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
            Conversation Progress
          </div>
          <ProgressBar percent={progress} />
          <div style={{ fontSize: 12, color: "#fbbf24", marginTop: 4 }}>{progress}%</div>
        </div>
      </div>

      {/* Chat Window */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 320,
          maxHeight: 420,
          overflowY: "auto",
          padding: "4px 4px",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.1) transparent",
        }}
      >
        {messages.map((msg, i) => (
          <ChatBubble key={i} msg={msg} isUser={msg.role === "user"} />
        ))}
        {isLoading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "18px 18px 18px 4px",
              }}
            >
              <TypingIndicator />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "16px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
        }}
      >
        <textarea
          id="business-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. 'I make food content and want to sell my own spice blends on Instagram…'"
          rows={2}
          disabled={isLoading}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            color: "#fff",
            fontSize: 14,
            lineHeight: 1.5,
            fontFamily: "inherit",
          }}
        />
        <button
          id="business-chat-send"
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          style={{
            padding: "0 20px",
            borderRadius: 12,
            border: "none",
            background:
              isLoading || !input.trim()
                ? "rgba(255,255,255,0.08)"
                : "linear-gradient(135deg, #f59e0b, #d97706)",
            color: isLoading || !input.trim() ? "rgba(255,255,255,0.3)" : "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            whiteSpace: "nowrap",
          }}
        >
          {isLoading ? "..." : "Send →"}
        </button>
      </div>

      {/* Final Checklist */}
      {finalChecklist && finalChecklist.length > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
              padding: "12px 16px",
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: 12,
            }}
          >
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <div style={{ fontWeight: 700, color: "#34d399", fontSize: 15 }}>
                Your Personalised Business Setup Checklist
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                {finalChecklist.filter((i) => i.priority === "required").length} required ·{" "}
                {finalChecklist.filter((i) => i.priority === "recommended").length} recommended ·{" "}
                {finalChecklist.filter((i) => i.priority === "optional").length} optional
              </div>
            </div>
          </div>
          {finalChecklist.map((item, i) => (
            <ChecklistCard key={i} item={item} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
