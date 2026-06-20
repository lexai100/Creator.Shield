/**
 * CreatorShield — Database layer
 * Replaces localStorage store.ts with Supabase calls.
 * Falls back to localStorage if Supabase is unavailable.
 */

import { supabase, getCurrentUserId } from "./supabase";

// ── Types (re-exported for compatibility) ─────────────────────────────────────

export interface CSConversation {
  id: string;
  title: string;
  type: "check" | "generate" | "general" | "business";
  createdAt: string;
  updatedAt: string;
  starred: boolean;
  messageCount: number;
}

export interface CSMessage {
  id?: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

export interface CSProfile {
  name: string;
  joinedAt: string;
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<CSProfile | null> {
  // Always keep name in localStorage for instant access
  try {
    const raw = localStorage.getItem("cs_profile_v1");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function saveProfile(profile: CSProfile): Promise<void> {
  // Save locally for instant access
  localStorage.setItem("cs_profile_v1", JSON.stringify(profile));

  // Also persist to Supabase
  const userId = await getCurrentUserId();
  if (!userId) return;
  await supabase.from("profiles").upsert({ id: userId, name: profile.name });
}

// ── Conversations ─────────────────────────────────────────────────────────────

export async function getConversations(type?: "general" | "business" | "check" | "generate"): Promise<CSConversation[]> {
  const userId = await getCurrentUserId();
  if (!userId) return getConversationsLocal(type);

  let query = supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error || !data) return getConversationsLocal(type);

  return data.map(row => ({
    id: row.id,
    title: row.title,
    type: row.type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    starred: false,
    messageCount: 0,
  }));
}

function getConversationsLocal(type?: string): CSConversation[] {
  try {
    const key = type === "business" ? "cs_biz_conversations_v1" : "cs_conversations_v1";
    const raw = localStorage.getItem(key);
    const all: CSConversation[] = raw ? JSON.parse(raw) : [];
    return type ? all.filter(c => c.type === type) : all;
  } catch { return []; }
}

export async function saveConversation(conv: CSConversation): Promise<void> {
  // Update localStorage for instant sidebar refresh
  const key = conv.type === "business" ? "cs_biz_conversations_v1" : "cs_conversations_v1";
  try {
    const raw = localStorage.getItem(key);
    const all: CSConversation[] = raw ? JSON.parse(raw) : [];
    const idx = all.findIndex(c => c.id === conv.id);
    if (idx >= 0) all[idx] = conv; else all.unshift(conv);
    localStorage.setItem(key, JSON.stringify(all));
  } catch {}

  // Persist to Supabase
  const userId = await getCurrentUserId();
  if (!userId) return;
  await supabase.from("conversations").upsert({
    id: conv.id,
    user_id: userId,
    title: conv.title,
    type: conv.type,
    updated_at: conv.updatedAt,
    created_at: conv.createdAt,
  });
}

export async function deleteConversation(id: string): Promise<void> {
  // Remove from localStorage
  for (const key of ["cs_conversations_v1", "cs_biz_conversations_v1"]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const all: CSConversation[] = JSON.parse(raw);
      localStorage.setItem(key, JSON.stringify(all.filter(c => c.id !== id)));
    } catch {}
  }
  // Delete from Supabase (messages cascade automatically)
  await supabase.from("conversations").delete().eq("id", id);
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function getMessages(conversationId: string): Promise<CSMessage[]> {
  const userId = await getCurrentUserId();
  if (!userId) return getMessagesLocal(conversationId);

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error || !data) return getMessagesLocal(conversationId);
  return data.map(row => ({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }));
}

function getMessagesLocal(conversationId: string): CSMessage[] {
  try {
    const raw = sessionStorage.getItem(`cs_chat_msgs_${conversationId}`);
    const msgs: { role: string; content: string }[] = raw ? JSON.parse(raw) : [];
    return msgs.map(m => ({ conversationId, role: m.role as "user" | "assistant", content: m.content }));
  } catch { return []; }
}

export async function saveMessage(msg: CSMessage): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await supabase.from("messages").insert({
    conversation_id: msg.conversationId,
    user_id: userId,
    role: msg.role,
    content: msg.content,
  });
}

export async function saveMessages(msgs: CSMessage[]): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  if (msgs.length === 0) return;
  await supabase.from("messages").insert(
    msgs.map(m => ({
      conversation_id: m.conversationId,
      user_id: userId,
      role: m.role,
      content: m.content,
    }))
  );
}

// ── Contract Results ──────────────────────────────────────────────────────────

export async function saveContractResult(params: {
  taskId: string;
  filename: string;
  analysis: unknown;
}): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await supabase.from("contract_results").insert({
    user_id: userId,
    task_id: params.taskId,
    filename: params.filename,
    analysis: params.analysis,
  });
}

export async function getContractResults() {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data } = await supabase
    .from("contract_results")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

// ── Generated Contracts ───────────────────────────────────────────────────────

export async function saveGeneratedContract(params: {
  documentType: string;
  description: string;
  documentText: string;
}): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await supabase.from("generated_contracts").insert({
    user_id: userId,
    document_type: params.documentType,
    description: params.description,
    document_text: params.documentText,
  });
}

export async function getGeneratedContracts() {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data } = await supabase
    .from("generated_contracts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

// ── ID generator ──────────────────────────────────────────────────────────────

export function newId(prefix = "cs"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
