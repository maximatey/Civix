// Stateless session helpers using HMAC-signed payment tokens
// No database required — works across all serverless function instances on Vercel

import crypto from "crypto";

const SECRET = process.env.PAYMENT_SECRET || "sivix-dev-secret-2025";

/**
 * Create a signed payment proof token for a given sessionId.
 * The frontend stores this and sends it with the generate-pdf request.
 */
export function createPaymentToken(sessionId: string): string {
  const timestamp = Date.now().toString();
  const payload = `${sessionId}:${timestamp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  // Encode as base64url: "sessionId:timestamp:sig"
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

/**
 * Verify a payment token. Returns true if the signature is valid.
 * Tokens expire after 1 hour.
 */
export function verifyPaymentToken(token: string): { valid: boolean; sessionId?: string } {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return { valid: false };

    const [sessionId, timestamp, sig] = parts;
    const payload = `${sessionId}:${timestamp}`;
    const expectedSig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");

    if (sig !== expectedSig) return { valid: false };

    // Expire tokens after 1 hour
    const age = Date.now() - parseInt(timestamp, 10);
    if (age > 3600_000) return { valid: false };

    return { valid: true, sessionId };
  } catch {
    return { valid: false };
  }
}
