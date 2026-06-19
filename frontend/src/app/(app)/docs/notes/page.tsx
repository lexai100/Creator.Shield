"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getNotes, saveNote, deleteNote, toggleStarNote, newId, type CSNote } from "@/lib/store";

const COLLECTIONS = ["All", "Contracts", "Business", "Research", "Personal"];

function NoteModal({ note, onSave, onClose }: { note: Partial<CSNote> | null; onSave: (n: CSNote) => void; onClose: () => void }) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [tagInput, setTagInput] = useState(note?.tags?.join(", ") ?? "");
  const [collection, setCollection] = useState(note?.collection ?? "Personal");

  const handleSave = () => {
    if (!title.trim()) return;
    const now = new Date().toISOString();
    onSave({
      id: note?.id ?? newId("note"),
      title: title.trim(),
      content: content.trim(),
      tags: tagInput.split(",").map(t => t.trim()).filter(Boolean),
      collection,
      createdAt: note?.createdAt ?? now,
      updatedAt: now,
      starred: note?.starred ?? false,
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(13,11,8,0.85)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--color-lexai-surface)", border: "1px solid var(--color-lexai-border)", borderRadius: 20, padding: 32, width: "100%", maxWidth: 560 }}>
        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.3rem", fontWeight: 800, marginBottom: 20 }}>
          {note?.id ? "Edit Note" : "New Note"}
        </h3>
        <input
          className="lexai-input"
          placeholder="Title…"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ marginBottom: 12, fontSize: "1rem", fontWeight: 600 }}
          autoFocus
        />
        <textarea
          className="lexai-input"
          placeholder="Write your note here…"
          value={content}
          onChange={e => setContent(e.target.value)}
          style={{ marginBottom: 12, minHeight: 160, resize: "vertical", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--color-lexai-text-muted)", display: "block", marginBottom: 6 }}>Tags (comma-separated)</label>
            <input className="lexai-input" placeholder="e.g. contract, brand deal" value={tagInput} onChange={e => setTagInput(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--color-lexai-text-muted)", display: "block", marginBottom: 6 }}>Collection</label>
            <select className="lexai-input" value={collection} onChange={e => setCollection(e.target.value)} style={{ cursor: "pointer" }}>
              {COLLECTIONS.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!title.trim()} onClick={handleSave}>Save Note</button>
        </div>
      </div>
    </div>
  );
}

export default function NotesPage() {
  const [notes, setNotes] = useState<CSNote[]>([]);
  const [search, setSearch] = useState("");
  const [activeCollection, setActiveCollection] = useState("All");
  const [editNote, setEditNote] = useState<Partial<CSNote> | null>(null);
  const [showModal, setShowModal] = useState(false);

  const refresh = () => setNotes(getNotes());
  useEffect(() => { refresh(); }, []);

  const filtered = notes.filter(n => {
    const matchColl = activeCollection === "All" || n.collection === activeCollection;
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
    return matchColl && matchSearch;
  });

  const handleSave = (n: CSNote) => { saveNote(n); refresh(); setShowModal(false); setEditNote(null); };
  const handleDelete = (id: string) => { if (confirm("Delete this note?")) { deleteNote(id); refresh(); } };
  const handleStar = (id: string) => { toggleStarNote(id); refresh(); };

  const collectionCounts = COLLECTIONS.reduce((acc, c) => {
    acc[c] = c === "All" ? notes.length : notes.filter(n => n.collection === c).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ padding: "28px 32px" }}>
      {showModal && (
        <NoteModal note={editNote} onSave={handleSave} onClose={() => { setShowModal(false); setEditNote(null); }} />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.8rem", fontWeight: 900, margin: 0 }}>📝 Notes</h1>
          <p style={{ color: "var(--color-lexai-text-muted)", marginTop: 4, fontSize: "0.85rem" }}>
            Create and organise your personal notes — {notes.length} total
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setEditNote(null); setShowModal(true); }}>
          + New Note
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "start" }}>
        {/* Main area */}
        <div>
          {/* Search */}
          <input
            className="lexai-input"
            placeholder="Search notes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 20 }}
          />

          {/* Notes grid */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--color-lexai-surface-2)", borderRadius: 16, border: "1px dashed var(--color-lexai-border)" }}>
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>📝</div>
              <p style={{ fontWeight: 700, marginBottom: 8 }}>{search ? "No notes match your search" : "No notes yet"}</p>
              <p style={{ color: "var(--color-lexai-text-muted)", fontSize: "0.85rem", marginBottom: 20 }}>
                {search ? "Try a different search term" : "Create your first note to keep track of important info"}
              </p>
              {!search && <button className="btn-primary" onClick={() => setShowModal(true)}>+ New Note</button>}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {filtered.map(n => (
                <div key={n.id} style={{
                  background: "var(--color-lexai-surface-2)",
                  border: "1px solid var(--color-lexai-border)",
                  borderRadius: 16, padding: 18,
                  display: "flex", flexDirection: "column", gap: 10,
                  cursor: "pointer", transition: "all 0.2s",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-lexai-accent)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-lexai-border)"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
                  onClick={() => { setEditNote(n); setShowModal(true); }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h4 style={{ fontWeight: 700, fontSize: "0.9rem", margin: 0, lineHeight: 1.4, flex: 1 }}>{n.title}</h4>
                    <button onClick={e => { e.stopPropagation(); handleStar(n.id); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", opacity: n.starred ? 1 : 0.4, flexShrink: 0 }}>
                      {n.starred ? "⭐" : "☆"}
                    </button>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "var(--color-lexai-text-muted)", lineHeight: 1.6, margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                    {n.content || <em>No content</em>}
                  </p>
                  {n.tags.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {n.tags.slice(0, 3).map(t => (
                        <span key={t} style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: 20, background: "rgba(212,130,26,0.12)", color: "var(--color-lexai-accent)", border: "1px solid rgba(212,130,26,0.2)" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <span style={{ fontSize: "0.68rem", color: "var(--color-lexai-text-muted)" }}>
                      {new Date(n.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                    <button onClick={e => { e.stopPropagation(); handleDelete(n.id); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--color-lexai-text-muted)", padding: "2px 6px", borderRadius: 6 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--color-lexai-danger)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--color-lexai-text-muted)"; }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Collections sidebar */}
        <div style={{ width: 200, background: "var(--color-lexai-surface-2)", border: "1px solid var(--color-lexai-border)", borderRadius: 16, padding: 16, position: "sticky", top: 80 }}>
          <h4 style={{ fontWeight: 700, fontSize: "0.82rem", marginBottom: 12, color: "var(--color-lexai-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Collections</h4>
          {COLLECTIONS.map(c => (
            <button
              key={c}
              onClick={() => setActiveCollection(c)}
              style={{
                width: "100%", textAlign: "left", background: activeCollection === c ? "rgba(212,130,26,0.12)" : "transparent",
                border: "none", borderRadius: 8, padding: "8px 10px",
                color: activeCollection === c ? "var(--color-lexai-accent)" : "var(--color-lexai-text-muted)",
                fontWeight: activeCollection === c ? 700 : 400,
                fontSize: "0.82rem", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                transition: "all 0.15s",
              }}
            >
              <span>{c}</span>
              <span style={{ fontSize: "0.72rem", background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "1px 7px" }}>{collectionCounts[c] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
