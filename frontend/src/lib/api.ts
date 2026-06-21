/**
 * LexAI / CreatorShield API Client
 * Handles all communication with the FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Vulnerability {
  id?: string;
  name: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  affected_clause: string;
  explanation: string;
  exploitation_scenario: string;
  suggested_fix: string;
}

// ── Creator-Economy Types ──────────────────────────────────────────────────────

export interface CreatorVulnerability extends Vulnerability {
  category: string;
  plain_english_explanation: string;
  cited_source: string;
  clause_text: string;
}

export interface UsageRightsAnalysis {
  scope: string[];
  is_perpetual: boolean;
  duration_days: number | null;
  perpetual_warning: string;
  suggested_cap_days: number;
  whitelisting_compensated: boolean;
  territory: string;
  usage_summary?: string;
}

export interface NegotiationScriptRequest {
  flagged_issues: CreatorVulnerability[];
  tone: "gentle" | "collaborative" | "firm";
  creator_name?: string;
  brand_name?: string;
}

export interface NegotiationScriptResponse {
  email_subject: string;
  email_body: string;
  tone_used: string;
  issues_addressed: number;
}

export interface BusinessSetupMessage {
  role: "user" | "assistant";
  content: string;
}

export interface BusinessChecklistItem {
  license_name: string;
  issuing_authority: string;
  when_required: string;
  how_to_apply: string;
  estimated_cost: string;
  timeline: string;
  priority: "required" | "recommended" | "optional";
  portal_url: string;
}

export interface BusinessSetupRequest {
  session_id: string;
  message: string;
  conversation_history: BusinessSetupMessage[];
}

export interface BusinessSetupResponse {
  session_id: string;
  reply: string;
  is_final: boolean;
  checklist: BusinessChecklistItem[] | null;
  progress_percent: number;
}

export interface CreatorContractAnalysis extends AnalysisResult {
  creator_vulnerabilities: CreatorVulnerability[];
  usage_rights: UsageRightsAnalysis | null;
  negotiation_script: string;
  plain_english_summary: Array<{ index: number; legal_text: string; plain_english: string }>;
  document_type_detected: string;
}

// ── Existing Types ─────────────────────────────────────────────────────────────

export interface LoopholeReport {
  exploitability_score: number;
  summary: string;
  vulnerabilities: Vulnerability[];
}

export interface AdversarialRound {
  round_number: number;
  score: number;
  vulnerabilities_found: number;
  patches_applied: number;
  patch_summary?: string;
  vulnerabilities: Vulnerability[];
  document_snapshot?: string;
}

export interface RadarScores {
  completeness: number;
  clarity: number;
  enforceability: number;
  fairness: number;
  compliance: number;
  risk_mitigation: number;
}

export interface AnalysisResult {
  task_id: string;
  summary: string;
  risk_score: number;
  rounds: AdversarialRound[];
  final_document: string;
  original_document: string;
  radar: RadarScores;
  pii_entities_found: number;
  heat_map?: Array<{ clause: string; risk_level: string; score: number }>;
}

export interface TaskStatus {
  task_id: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  current_round: number;
  result?: AnalysisResult;
  error?: string;
}

export interface TemplateInfo {
  document_type: string;
  title: string;
  description: string;
  sample_fields: string[];
}

export interface GenerationRequest {
  document_type: string;
  description: string;
  party_a?: string;
  party_b?: string;
  location?: string;
  additional_context?: string;
  run_adversarial?: boolean;
  max_rounds?: number;
}

// ── REST API ────────────────────────────────────────────────────────────────

export async function analyzeDocument(
  file?: File,
  text?: string,
  anonymizePii: boolean = true
): Promise<{ task_id: string; ws_url: string }> {
  const formData = new FormData();
  if (file) formData.append("file", file);
  if (text) formData.append("text", text);
  formData.append("anonymize_pii", String(anonymizePii));

  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Analysis failed");
  }

  return res.json();
}

export async function generateDocument(
  request: GenerationRequest
): Promise<{ task_id: string; ws_url: string }> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Generation failed");
  }

  return res.json();
}

export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  const res = await fetch(`${API_BASE}/api/status/${taskId}`);
  if (!res.ok) throw new Error("Failed to fetch task status");
  return res.json();
}

export async function getTemplates(): Promise<TemplateInfo[]> {
  const res = await fetch(`${API_BASE}/api/templates`);
  if (!res.ok) throw new Error("Failed to fetch templates");
  return res.json();
}

export async function downloadDocument(taskId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/download/${taskId}`);
  if (!res.ok) throw new Error("Failed to download document");
  return res.text();
}

export async function getHealthCheck(): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Backend not available");
  return res.json();
}

// ── Creator-Economy API ────────────────────────────────────────────────────────

export async function analyzeCreatorContract(
  file?: File,
  text?: string,
  options: {
    creatorName?: string;
    brandName?: string;
    tone?: string;
    anonymizePii?: boolean;
  } = {}
): Promise<CreatorContractAnalysis> {
  const formData = new FormData();
  if (file) formData.append("file", file);
  if (text) formData.append("text", text);
  formData.append("creator_name", options.creatorName || "");
  formData.append("brand_name", options.brandName || "");
  formData.append("tone", options.tone || "collaborative");
  formData.append("anonymize_pii", String(options.anonymizePii ?? true));

  const res = await fetch(`${API_BASE}/api/analyze/creator-contract`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Creator contract analysis failed");
  }

  return res.json();
}

export async function generateNegotiationScript(
  request: NegotiationScriptRequest
): Promise<NegotiationScriptResponse> {
  const res = await fetch(`${API_BASE}/api/negotiation-script`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Negotiation script generation failed");
  }

  return res.json();
}

export async function businessSetupChat(
  request: BusinessSetupRequest
): Promise<BusinessSetupResponse> {
  const res = await fetch(`${API_BASE}/api/business-setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Business setup chat failed");
  }

  return res.json();
}

// ── WebSocket ───────────────────────────────────────────────────────────────

export type WSMessage =
  | { type: "status"; task_id: string; status: string; progress: number }
  | { type: "round_update"; task_id: string; round: AdversarialRound; progress: number }
  | { type: "completed"; task_id: string; result: AnalysisResult }
  | { type: "error"; task_id: string; error: string }
  | { type: "pong" };

export function connectWebSocket(
  taskId: string,
  onMessage: (msg: WSMessage) => void,
  onError?: (err: Event) => void,
  onClose?: () => void
): WebSocket {
  const wsBase = API_BASE.replace(/^http/, "ws");
  const ws = new WebSocket(`${wsBase}/api/ws/${taskId}`);

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data) as WSMessage;
      onMessage(msg);
    } catch (e) {
      console.error("Failed to parse WS message:", e);
    }
  };

  ws.onerror = (err) => {
    console.error("WebSocket error:", err);
    onError?.(err);
  };

  ws.onclose = () => {
    onClose?.();
  };

  // Keepalive ping every 30s
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping" }));
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);

  return ws;
}

// ── Voice ────────────────────────────────────────────────────────────────────

export interface STTResult {
  text: string;
  language: string;
  duration_seconds: number;
}

export async function sendVoiceAudio(
  audioBlob: Blob,
  language: string = "auto"
): Promise<STTResult> {
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("language", language);

  const res = await fetch(`${API_BASE}/api/voice/stt`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "STT failed");
  }
  return res.json();
}

// ── Indian Kanoon ─────────────────────────────────────────────────────────────

export interface KanoonResult {
  tid: number;
  title: string;
  headline: string;
  doc_type: string;
  court: string;
  date: string;
  url: string;
}

export interface KanoonSearchResponse {
  query: string;
  court: string;
  page: number;
  results: KanoonResult[];
  attribution: string;
}

export async function searchKanoon(
  q: string,
  court: string = "",
  page: number = 0
): Promise<KanoonSearchResponse> {
  const params = new URLSearchParams({ q, court, page: String(page) });
  const res = await fetch(`${API_BASE}/api/kanoon/search?${params}`);
  if (!res.ok) {
    if (res.status === 503) {
      throw new Error("Indian Kanoon not configured on this server");
    }
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Case law search failed");
  }
  return res.json();
}

export async function searchKanoonForType(
  documentType: string,
  court: string = "",
  context: string = ""
): Promise<KanoonSearchResponse> {
  const params = new URLSearchParams({
    document_type: documentType,
    court,
    context,
  });
  const res = await fetch(`${API_BASE}/api/kanoon/search-for-type?${params}`);
  if (!res.ok) {
    if (res.status === 503) {
      throw new Error("Indian Kanoon not configured on this server");
    }
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Case law search failed");
  }
  return res.json();
}

