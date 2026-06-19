"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDocuments, deleteDocument, type CSDocument } from "@/lib/store";

const FILE_ICONS: Record<string, string> = {
  pdf: "📕", txt: "📄", docx: "📘", doc: "📘", default: "📎",
};

export default function DocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<CSDocument[]>([]);
  const [search, setSearch] = useState("");

  const refresh = () => setDocs(getDocuments());
  useEffect(() => { refresh(); }, []);

  const filtered = docs.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.conversationTitle.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (confirm("Remove this document from your library?")) { deleteDocument(id); refresh(); }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const fileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() ?? "default";
    return FILE_ICONS[ext] ?? FILE_ICONS.default;
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.8rem", fontWeight: 900, margin: 0 }}>📄 Documents</h1>
        <p style={{ color: "var(--color-lexai-text-muted)", marginTop: 4, fontSize: "0.85rem" }}>
          All files you've uploaded — {docs.length} total
        </p>
      </div>

      {/* Search */}
      <input
        className="lexai-input"
        placeholder="Search by file name or conversation…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 20 }}
      />

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--color-lexai-surface-2)", borderRadius: 16, border: "1px dashed var(--color-lexai-border)" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>📂</div>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>{search ? "No documents match" : "No documents yet"}</p>
          <p style={{ color: "var(--color-lexai-text-muted)", fontSize: "0.85rem", marginBottom: 20 }}>
            {search ? "Try a different search" : "Upload a contract in Check My Contract to see it here"}
          </p>
          {!search && (
            <button className="btn-primary" onClick={() => router.push("/check")}>🛡️ Check a Contract</button>
          )}
        </div>
      ) : (
        <div style={{ background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 16, overflow: "hidden" }}>
          {/* Column headers */}
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 1.5fr 80px 80px 48px",
            padding: "10px 18px", borderBottom: "1px solid var(--color-lexai-border)",
            fontSize: "0.72rem", color: "var(--color-lexai-text-muted)", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            <span>File Name</span>
            <span>From Conversation</span>
            <span>Size</span>
            <span>Uploaded</span>
            <span />
          </div>

          {filtered.map((doc, i) => (
            <div
              key={doc.id}
              style={{
                display: "grid", gridTemplateColumns: "2fr 1.5fr 80px 80px 48px",
                padding: "14px 18px", alignItems: "center",
                borderBottom: i < filtered.length - 1 ? "1px solid var(--color-lexai-border)" : "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              {/* Name */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{fileIcon(doc.name)}</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.85rem", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>{doc.name}</p>
                  <p style={{ fontSize: "0.7rem", color: "var(--color-lexai-text-muted)", margin: 0, textTransform: "uppercase" }}>{doc.fileType}</p>
                </div>
              </div>

              {/* Conversation */}
              <button
                onClick={() => router.push(`/chat/${doc.conversationId}`)}
                style={{
                  background: "none", border: "none", color: "var(--color-lexai-accent)", cursor: "pointer",
                  fontSize: "0.8rem", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: 0,
                }}
                title={doc.conversationTitle}
              >
                {doc.conversationTitle}
              </button>

              {/* Size */}
              <span style={{ fontSize: "0.8rem", color: "var(--color-lexai-text-muted)" }}>{formatSize(doc.size)}</span>

              {/* Date */}
              <span style={{ fontSize: "0.8rem", color: "var(--color-lexai-text-muted)" }}>
                {new Date(doc.uploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>

              {/* Delete */}
              <button
                onClick={() => handleDelete(doc.id)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", color: "var(--color-lexai-text-muted)", padding: 4, borderRadius: 6 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--color-lexai-danger)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--color-lexai-text-muted)"; }}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
