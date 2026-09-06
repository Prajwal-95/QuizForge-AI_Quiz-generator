import type {
  AttemptDetail,
  Metrics,
  QuestionInput,
  Quiz,
  QuizAnalytics,
  QuizMeta,
  QuizResultRow,
  QuizSummary,
  StudentAttemptStart,
  StudentQuizInfo,
  StudentSubmissionResult,
} from "./types";

/**
 * The API base URL is resolved in this priority order:
 *
 *  1. `VITE_API_BASE` env var (set at build time on cloud platforms,
 *     e.g. Render/Railway: `VITE_API_BASE=https://mybackend.onrender.com/api`).
 *  2. If the page itself is being served from port 8001 (backend serves
 *     the SPA), or a standard HTTPS/HTTP port with no `VITE_API_BASE`,
 *     use the current origin — same-origin requests, no CORS/mixed content.
 *  3. Fallback for local development (Vite on 5173) and LAN use:
 *     `http://<hostname>:8001/api`.
 */
const API_PORT = 8001;

function resolveApiBase(): string {
  // 1) Explicit deploy-time override. Accepts either
  //    "https://host/api" or just "https://host" (the /api suffix is auto-added).
  const deployBase = import.meta.env.VITE_API_BASE as string | undefined;
  if (deployBase) {
    const clean = deployBase.replace(/\/+$/, "");
    return clean.endsWith("/api") ? clean : `${clean}/api`;
  }

  const hostname =
    typeof window !== "undefined" && window.location?.hostname
      ? window.location.hostname
      : "localhost";

  // 2) Same-origin: the backend (FastAPI at :8001) or a single-service
  //    deploy that serves both SPA and API from one origin.
  if (typeof window !== "undefined") {
    const port = window.location.port;
    // Local dev server on 5173 should NOT use the same origin — the API
    // lives on a separate port (8001) during development.
    if (port !== "5173") {
      const host = window.location.host;
      const proto = window.location.protocol; // preserves http/https
      return `${proto}//${host}/api`;
    }
  }

  // 3) Classic local-dev / LAN fallback.
  const host = hostname === "::1" || hostname === "[::1]" ? "localhost" : hostname;
  return `http://${host}:${API_PORT}/api`;
}

export const API = resolveApiBase();

const TOKEN_KEY = "quizforge-token";
const USER_KEY = "quizforge-user";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: { id: number; name: string; email: string }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): { id: number; name: string; email: string } | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request<T>(path: string, options: RequestInit = {}, auth = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      message = extractApiError(data.detail, `Request failed (${response.status})`);
    } catch {
      // non-JSON error body — keep the default message
    }
    if (response.status === 401 && auth) {
      clearSession();
      // Let the app shell know the session died so it can prompt a fresh sign-in.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("quizforge:unauthorized"));
      }
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function extractApiError(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail || fallback;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d) => (d && typeof d === "object" ? (d as { msg?: string }).msg : undefined))
      .filter((m): m is string => Boolean(m));
    return msgs.length ? msgs.join("; ") : fallback;
  }
  if (detail && typeof detail === "object") {
    const d = detail as { message?: string; msg?: string; error?: string };
    return d.message || d.msg || d.error || fallback;
  }
  return fallback;
}

export async function register(name: string, email: string, password: string) {
  return request<{ token: string; user: { id: number; name: string; email: string } }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function login(email: string, password: string) {
  return request<{ token: string; user: { id: number; name: string; email: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function listMyQuizzes(): Promise<QuizSummary[]> {
  return request<QuizSummary[]>("/quizzes", { method: "GET" }, true);
}

export async function fetchQuiz(id: number): Promise<Quiz> {
  return request<Quiz>(`/quizzes/${id}`, { method: "GET" }, true);
}

export async function createQuiz(payload: { title: string; description: string; subject: string; difficulty: string; time_limit: number; questions: QuestionInput[] }): Promise<Quiz> {
  return request<Quiz>("/quizzes", { method: "POST", body: JSON.stringify(payload) }, true);
}

export async function updateQuiz(id: number, payload: { title?: string; description?: string; subject?: string; difficulty?: string; time_limit?: number; questions?: QuestionInput[] }): Promise<Quiz> {
  return request<Quiz>(`/quizzes/${id}`, { method: "PUT", body: JSON.stringify(payload) }, true);
}

export async function deleteQuiz(id: number): Promise<void> {
  await request<{ deleted: boolean }>(`/quizzes/${id}`, { method: "DELETE" }, true);
}

export async function publishQuiz(id: number): Promise<Quiz> {
  return request<Quiz>(`/quizzes/${id}/publish`, { method: "POST" }, true);
}

export async function closeQuiz(id: number): Promise<Quiz> {
  return request<Quiz>(`/quizzes/${id}/close`, { method: "POST" }, true);
}

export async function reopenQuiz(id: number): Promise<Quiz> {
  return request<Quiz>(`/quizzes/${id}/reopen`, { method: "POST" }, true);
}

export async function generateQuizAI(topic: string, text: string, settings: Record<string, unknown>): Promise<Quiz> {
  return request<Quiz>("/quizzes/generate", {
    method: "POST",
    body: JSON.stringify({ topic, text, settings }),
  }, true);
}

export async function getQuizResults(id: number): Promise<QuizResultRow[]> {
  return request<QuizResultRow[]>(`/quizzes/${id}/results`, { method: "GET" }, true);
}

export async function getQuizAnalytics(id: number): Promise<QuizAnalytics> {
  return request<QuizAnalytics>(`/quizzes/${id}/analytics`, { method: "GET" }, true);
}

export async function getAttemptDetail(quizId: number, attemptId: number): Promise<AttemptDetail> {
  return request<AttemptDetail>(`/quizzes/${quizId}/attempts/${attemptId}`, { method: "GET" }, true);
}

export async function getMetrics(): Promise<Metrics> {
  return request<Metrics>("/analytics/overview", { method: "GET" }, true);
}

export async function fetchPublicQuiz(shareCode: string): Promise<StudentQuizInfo> {
  return request<StudentQuizInfo>(`/quizzes/share/${shareCode}`, { method: "GET" });
}

export async function startStudentAttempt(shareCode: string, studentName: string, studentId: string): Promise<StudentAttemptStart> {
  return request<StudentAttemptStart>(`/quizzes/share/${shareCode}/attempts`, {
    method: "POST",
    body: JSON.stringify({ student_name: studentName, student_identifier: studentId }),
  });
}

export async function submitStudentAttempt(
  shareCode: string,
  attemptId: number,
  answers: Array<{ question_id: number; selected_option_id: number | null }>
): Promise<StudentSubmissionResult> {
  return request<StudentSubmissionResult>(`/quizzes/share/${shareCode}/attempts/${attemptId}/submit`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}

export async function fetchPublicResult(attemptId: number): Promise<StudentSubmissionResult> {
  return request<StudentSubmissionResult>(`/quizzes/attempts/${attemptId}/result`, { method: "GET" });
}

export async function uploadDocument(form: FormData): Promise<string> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API}/documents/upload`, { method: "POST", body: form, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(extractApiError(data.detail, "Upload failed"));
  return data.text || "";
}

export async function fetchDocumentUrl(url: string): Promise<{ text: string; name?: string; characters?: number }> {
  return request<{ text: string; name?: string; characters?: number }>("/documents/fetch-url", {
    method: "POST",
    body: JSON.stringify({ url }),
  }, true);
}

export async function checkHealth(): Promise<boolean> {
  try {
    const r = await fetch(`${API}/health`);
    if (!r.ok) return false;
    const d = await r.json();
    return d?.status === "ok";
  } catch {
    return false;
  }
}

export async function shareUrl(shareCode: string): Promise<string> {
  // Use the origin the user is actually on (the deployed public URL, or
  // localhost when running locally) so students can open the link directly.
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/quiz/${shareCode}`;
}
