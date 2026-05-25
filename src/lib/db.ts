// In-memory session store — works on Vercel serverless (warm container)
// Sessions persist for the duration of the payment flow (minutes), which is all we need.

export interface SessionData {
  status: "PENDING" | "PAID";
  cvText?: string;
  jobDescription?: string;
  pdfName?: string;
  score?: number;
  missingKeywords?: string[];
  roast?: string;
  createdAt: number;
}

// Global Map survives across requests within the same serverless container instance
const sessions = new Map<string, SessionData>();

export function getSession(sessionId: string): SessionData | null {
  return sessions.get(sessionId) ?? null;
}

export function saveSession(sessionId: string, data: Partial<SessionData>): void {
  const existing = sessions.get(sessionId) ?? {
    status: "PENDING" as const,
    createdAt: Date.now(),
  };
  sessions.set(sessionId, { ...existing, ...data } as SessionData);
}
