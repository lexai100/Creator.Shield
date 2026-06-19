"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// ── Sliding sample questions ─────────────────────────────────────────────────

const SAMPLE_QUESTIONS = [
  "Can I legally call out a brand that scammed me without getting sued?",
  "Is my brand deal contract safe to sign?",
  "A brand wants 12 months of exclusivity — is that normal?",
  "How do I make sure a brand can't use my content forever for free?",
  "What happens if a brand doesn't pay me after I deliver the content?",
  "Can I review a brand's product negatively without legal trouble?",
];

const FEATURES = [
  {
    icon: "🛡️",
    title: "Check My Contract",
    desc: "Upload any brand deal, collaboration, or service contract. Our AI finds every loophole and rewrites the risky clauses.",
    color: "rgba(74,222,128,0.08)",
    border: "rgba(74,222,128,0.2)",
  },
  {
    icon: "✍️",
    title: "Write a Contract",
    desc: "Describe what you need in plain language — get a formal, legally-sound contract in seconds. No lawyer needed.",
    color: "rgba(96,165,250,0.08)",
    border: "rgba(96,165,250,0.2)",
  },
  {
    icon: "🏢",
    title: "Set Up My Business",
    desc: "An AI guide walks you through every licence, registration, and legal step to properly set up your creator business in India.",
    color: "rgba(212,130,26,0.08)",
    border: "rgba(212,130,26,0.2)",
  },
  {
    icon: "📧",
    title: "Negotiate with Brands",
    desc: "Got a bad contract? Pick a tone — gentle, collaborative, or firm — and the AI writes the perfect negotiation email for you.",
    color: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.2)",
  },
];

const HOW_IT_WORKS = [
  { step: "01", icon: "📤", title: "Share Your Contract", desc: "Upload a PDF, paste the text, or just describe your situation in plain English." },
  { step: "02", icon: "🤖", title: "AI Checks Every Clause", desc: "Two AI agents work together — one finds every risk and loophole, the other fixes them." },
  { step: "03", icon: "✅", title: "Get Clear Answers", desc: "Receive a plain-English breakdown, a fixed contract, relevant case law, and a ready-to-send negotiation email." },
];

// ── Main landing page ────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sampleIdx, setSampleIdx] = useState(0);
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cycle sample questions every 3s
  useEffect(() => {
    const t = setInterval(() => setSampleIdx(i => (i + 1) % SAMPLE_QUESTIONS.length), 3000);
    return () => clearInterval(t);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setVisible(prev => new Set([...prev, e.target.id])); });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll("[data-reveal]").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/chat?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSampleClick = (q: string) => {
    router.push(`/chat?q=${encodeURIComponent(q)}`);
  };

  return (
    <div style={{ minHeight: "100vh", fontFamily: "var(--font-body)" }}>
      {/* ── Navbar ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(13,11,8,0.85)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--color-lexai-border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px", height: 64,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => router.push("/")}>
          <span style={{ fontSize: "1.5rem" }}>🛡️</span>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.3rem", fontWeight: 900 }}>
            Creator<span style={{ color: "var(--color-lexai-accent)" }}>Shield</span>
          </span>
          <span style={{ fontSize: "0.65rem", color: "var(--color-lexai-text-muted)", marginLeft: 4, letterSpacing: "0.08em", textTransform: "uppercase", paddingTop: 2 }}>
            for Creators
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 32, fontSize: "0.85rem" }}>
          <a href="#features" style={{ color: "var(--color-lexai-text-muted)", textDecoration: "none" }}>Features</a>
          <a href="#how-it-works" style={{ color: "var(--color-lexai-text-muted)", textDecoration: "none" }}>How it works</a>
          <button onClick={() => router.push("/dashboard")} className="btn-primary" style={{ padding: "8px 20px", fontSize: "0.85rem" }}>
            Open App →
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ textAlign: "center", padding: "72px 24px 80px", position: "relative" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px",
          borderRadius: 20, border: "1px solid rgba(212,130,26,0.3)",
          background: "rgba(212,130,26,0.08)", marginBottom: 24,
          fontSize: "0.75rem", color: "var(--color-lexai-accent)", fontWeight: 700, letterSpacing: "0.06em",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-lexai-accent)", animation: "pulse 2s infinite", display: "inline-block" }} />
          AI Legal Protection for Indian Creators
        </div>

        <h1 style={{
          fontFamily: "var(--font-heading)", fontSize: "clamp(2rem, 6vw, 3.8rem)",
          fontWeight: 900, lineHeight: 1.15, marginBottom: 20, letterSpacing: "-0.02em",
        }}>
          Protect Your Creator Business<br />
          <span style={{
            background: "linear-gradient(135deg, var(--color-lexai-accent), var(--color-lexai-accent-glow))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Without a Lawyer</span>
        </h1>

        <p style={{
          fontSize: "clamp(0.95rem, 2vw, 1.15rem)", color: "var(--color-lexai-text-muted)",
          maxWidth: 560, margin: "0 auto 20px", lineHeight: 1.75,
        }}>
          Got a risky brand deal? Not sure if you can legally call out a scam brand? 
          CreatorShield gives you clear answers — fast, private, and in plain English.
        </p>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 40 }}>
          {["📄 Check Contracts", "⚖️ Indian Law", "🔒 Private", "🆓 Free to Use"].map(f => (
            <span key={f} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid var(--color-lexai-border)", background: "var(--color-lexai-surface-2)", fontSize: "0.78rem", color: "var(--color-lexai-text-muted)" }}>
              {f}
            </span>
          ))}
        </div>

        {/* ── Chatbot widget ── */}
        <div style={{
          maxWidth: 640, margin: "0 auto",
          background: "var(--color-lexai-surface)",
          border: "1px solid var(--color-lexai-border)",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        }}>
          {/* Widget header */}
          <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--color-lexai-border)" }}>
            <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 14, textAlign: "center" }}>
              Hi! How can I help you today?
            </p>
            {/* Cycling sample chips */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {[SAMPLE_QUESTIONS[sampleIdx], SAMPLE_QUESTIONS[(sampleIdx + 1) % SAMPLE_QUESTIONS.length], SAMPLE_QUESTIONS[(sampleIdx + 2) % SAMPLE_QUESTIONS.length]].map((q, i) => (
                <button
                  key={`${sampleIdx}-${i}`}
                  onClick={() => handleSampleClick(q)}
                  style={{
                    padding: "7px 14px", borderRadius: 20,
                    border: "1px solid var(--color-lexai-border)",
                    background: "var(--color-lexai-surface-2)",
                    color: "var(--color-lexai-text)",
                    fontSize: "0.76rem", cursor: "pointer",
                    transition: "all 0.2s",
                    animation: "fadeSlideIn 0.4s ease",
                    maxWidth: 220, textAlign: "center", lineHeight: 1.4,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--color-lexai-accent)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(212,130,26,0.06)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--color-lexai-border)";
                    (e.currentTarget as HTMLElement).style.background = "var(--color-lexai-surface-2)";
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} style={{ padding: "16px 20px", display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              ref={textareaRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
              placeholder="Type your question about contracts, rights, or your creator business…"
              rows={2}
              style={{
                flex: 1,
                background: "var(--color-lexai-surface-2)",
                border: "1.5px solid var(--color-lexai-border)",
                borderRadius: 14,
                padding: "10px 14px",
                fontSize: "0.88rem",
                color: "var(--color-lexai-text)",
                resize: "none",
                outline: "none",
                fontFamily: "var(--font-body)",
                transition: "border-color 0.2s",
              }}
              onFocus={e => { (e.target as HTMLElement).style.borderColor = "var(--color-lexai-accent)"; }}
              onBlur={e => { (e.target as HTMLElement).style.borderColor = "var(--color-lexai-border)"; }}
            />
            <button
              type="submit"
              disabled={!query.trim()}
              style={{
                width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                background: query.trim() ? "var(--color-lexai-accent)" : "var(--color-lexai-surface-2)",
                border: "none", cursor: query.trim() ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.1rem", color: query.trim() ? "#0d0b08" : "var(--color-lexai-text-muted)",
                transition: "all 0.2s",
              }}
            >↑</button>
          </form>
          <p style={{ textAlign: "center", fontSize: "0.68rem", color: "var(--color-lexai-text-muted)", padding: "0 20px 14px", opacity: 0.7 }}>
            Free to use. Your conversations are private.
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: "72px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div data-reveal id="features-header" style={{ textAlign: "center", marginBottom: 48, opacity: visible.has("features-header") ? 1 : 0, transform: visible.has("features-header") ? "none" : "translateY(20px)", transition: "all 0.5s ease" }}>
          <span style={{ fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-lexai-accent)", fontWeight: 700 }}>Features</span>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.5rem, 4vw, 2.5rem)", fontWeight: 900, marginTop: 10, marginBottom: 12 }}>
            Everything You Need to Stay Protected
          </h2>
          <p style={{ color: "var(--color-lexai-text-muted)", fontSize: "1rem", maxWidth: 500, margin: "0 auto" }}>
            Four tools, all included. From checking contracts to calling out brands safely.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              id={`feature-${i}`}
              data-reveal
              style={{
                background: f.color, border: `1px solid ${f.border}`,
                borderRadius: 20, padding: "28px 24px", cursor: "pointer",
                opacity: visible.has(`feature-${i}`) ? 1 : 0,
                transform: visible.has(`feature-${i}`) ? "none" : "translateY(24px)",
                transition: `all 0.5s ease ${i * 0.08}s`,
              }}
              onClick={() => router.push(f.title === "Check My Contract" ? "/check" : f.title === "Write a Contract" ? "/generate" : f.title === "Set Up My Business" ? "/business" : "/negotiate")}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = visible.has(`feature-${i}`) ? "none" : "translateY(24px)"; }}
            >
              <div style={{ fontSize: "2rem", marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--color-lexai-text-muted)", lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" style={{ padding: "72px 24px", background: "rgba(255,255,255,0.02)", borderTop: "1px solid var(--color-lexai-border)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div data-reveal id="how-header" style={{ textAlign: "center", marginBottom: 48, opacity: visible.has("how-header") ? 1 : 0, transform: visible.has("how-header") ? "none" : "translateY(20px)", transition: "all 0.5s ease" }}>
            <span style={{ fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-lexai-accent)", fontWeight: 700 }}>How It Works</span>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.5rem, 4vw, 2.5rem)", fontWeight: 900, marginTop: 10, marginBottom: 12 }}>
              No Appointments. No Waiting.
            </h2>
            <p style={{ color: "var(--color-lexai-text-muted)", fontSize: "1rem" }}>
              Works 24/7, even at 2 AM before you sign that brand deal.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={step.step}
                id={`step-${i}`}
                data-reveal
                style={{
                  display: "flex", gap: 24, alignItems: "flex-start",
                  opacity: visible.has(`step-${i}`) ? 1 : 0,
                  transform: visible.has(`step-${i}`) ? "none" : "translateX(-20px)",
                  transition: `all 0.5s ease ${i * 0.1}s`,
                }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                  background: "rgba(212,130,26,0.12)", border: "1px solid rgba(212,130,26,0.3)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: "1.2rem" }}>{step.icon}</span>
                </div>
                <div style={{ paddingTop: 4 }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-lexai-accent)", letterSpacing: "0.08em" }}>STEP {step.step}</span>
                  <h3 style={{ fontWeight: 800, fontSize: "1.05rem", margin: "4px 0 8px" }}>{step.title}</h3>
                  <p style={{ fontSize: "0.88rem", color: "var(--color-lexai-text-muted)", lineHeight: 1.7, margin: 0 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 52 }}>
            <button onClick={() => router.push("/dashboard")} className="btn-primary" style={{ padding: "14px 36px", fontSize: "1rem" }}>
              Get Started for Free →
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid var(--color-lexai-border)", padding: "28px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "1.1rem" }}>🛡️</span>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "1rem" }}>
            Creator<span style={{ color: "var(--color-lexai-accent)" }}>Shield</span>
          </span>
        </div>
        <p style={{ fontSize: "0.75rem", color: "var(--color-lexai-text-muted)" }}>
          AI-powered contract protection for Indian creators. Not a substitute for professional legal advice.
        </p>
      </footer>
    </div>
  );
}
