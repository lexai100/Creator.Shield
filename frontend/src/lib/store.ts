/**
 * CreatorShield — centralised localStorage data layer
 * All client-side persistence lives here.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CSConversation {
  id: string;
  title: string;
  type: "check" | "generate" | "general";
  createdAt: string;
  updatedAt: string;
  starred: boolean;
  messageCount: number;
  riskScore?: number; // for "check" conversations
}

export interface CSDocument {
  id: string;
  name: string;
  size: number; // bytes
  conversationId: string;
  conversationTitle: string;
  uploadedAt: string;
  fileType: string; // "pdf", "txt", "docx" etc.
}

export interface CSNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  collection: string;
  createdAt: string;
  updatedAt: string;
  starred: boolean;
}

export interface CSUserProfile {
  name: string;
  joinedAt: string;
}

// ── Storage keys ──────────────────────────────────────────────────────────────

const KEYS = {
  CONVERSATIONS: "cs_conversations_v1",
  DOCUMENTS:     "cs_documents_v1",
  NOTES:         "cs_notes_v1",
  PROFILE:       "cs_profile_v1",
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ── Profile ───────────────────────────────────────────────────────────────────

export function getProfile(): CSUserProfile | null {
  return safeGet<CSUserProfile | null>(KEYS.PROFILE, null);
}

export function saveProfile(profile: CSUserProfile): void {
  safeSet(KEYS.PROFILE, profile);
}

// ── Conversations ─────────────────────────────────────────────────────────────

export function getConversations(): CSConversation[] {
  return safeGet<CSConversation[]>(KEYS.CONVERSATIONS, []);
}

export function getConversation(id: string): CSConversation | null {
  return getConversations().find(c => c.id === id) ?? null;
}

export function saveConversation(conv: CSConversation): void {
  const all = getConversations();
  const idx = all.findIndex(c => c.id === conv.id);
  if (idx >= 0) all[idx] = conv;
  else all.unshift(conv);
  safeSet(KEYS.CONVERSATIONS, all);
}

export function deleteConversation(id: string): void {
  safeSet(KEYS.CONVERSATIONS, getConversations().filter(c => c.id !== id));
}

export function toggleStarConversation(id: string): void {
  const all = getConversations().map(c =>
    c.id === id ? { ...c, starred: !c.starred } : c
  );
  safeSet(KEYS.CONVERSATIONS, all);
}

// ── Documents ─────────────────────────────────────────────────────────────────

export function getDocuments(): CSDocument[] {
  return safeGet<CSDocument[]>(KEYS.DOCUMENTS, []);
}

export function saveDocument(doc: CSDocument): void {
  const all = getDocuments();
  if (!all.find(d => d.id === doc.id)) {
    all.unshift(doc);
    safeSet(KEYS.DOCUMENTS, all);
  }
}

export function deleteDocument(id: string): void {
  safeSet(KEYS.DOCUMENTS, getDocuments().filter(d => d.id !== id));
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export function getNotes(): CSNote[] {
  return safeGet<CSNote[]>(KEYS.NOTES, []);
}

export function saveNote(note: CSNote): void {
  const all = getNotes();
  const idx = all.findIndex(n => n.id === note.id);
  if (idx >= 0) all[idx] = note;
  else all.unshift(note);
  safeSet(KEYS.NOTES, all);
}

export function deleteNote(id: string): void {
  safeSet(KEYS.NOTES, getNotes().filter(n => n.id !== id));
}

export function toggleStarNote(id: string): void {
  const all = getNotes().map(n =>
    n.id === id ? { ...n, starred: !n.starred } : n
  );
  safeSet(KEYS.NOTES, all);
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export function getStats() {
  const convs  = getConversations();
  const docs   = getDocuments();
  const notes  = getNotes();
  const storageBytes =
    (localStorage.getItem(KEYS.CONVERSATIONS)?.length ?? 0) +
    (localStorage.getItem(KEYS.DOCUMENTS)?.length ?? 0) +
    (localStorage.getItem(KEYS.NOTES)?.length ?? 0);
  return {
    totalChats: convs.length,
    documents:  docs.length,
    notes:      notes.length,
    storageMB:  (storageBytes / (1024 * 1024)).toFixed(2),
  };
}

// ── ID generator ──────────────────────────────────────────────────────────────

export function newId(prefix = "cs"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
