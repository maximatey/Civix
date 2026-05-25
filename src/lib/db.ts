import fs from "fs";
import path from "path";

// Define DB path inside the project (.next or src/lib or tmp)
// We will store it inside src/lib/db.json in the workspace
const DB_PATH = path.join(process.cwd(), "src/lib/db.json");

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

interface DBData {
  sessions: Record<string, SessionData>;
}

function initDB(): DBData {
  if (!fs.existsSync(DB_PATH)) {
    const defaultData: DBData = { sessions: {} };
    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), "utf8");
    return defaultData;
  }
  try {
    const data = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (e) {
    console.error("Gagal membaca database JSON, mereset database:", e);
    return { sessions: {} };
  }
}

export function getSession(sessionId: string): SessionData | null {
  const db = initDB();
  return db.sessions[sessionId] || null;
}

export function saveSession(sessionId: string, data: Partial<SessionData>): void {
  const db = initDB();
  const existing = db.sessions[sessionId] || {
    status: "PENDING",
    createdAt: Date.now(),
  };

  db.sessions[sessionId] = {
    ...existing,
    ...data,
  } as SessionData;

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}
