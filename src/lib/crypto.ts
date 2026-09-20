import crypto from "crypto";

// ---------------------------------------------------------------------------
// AES-256-GCM encryption used for social tokens & provider API keys.
// Secrets are NEVER stored in Google Sheets and never sent to the client.
// ---------------------------------------------------------------------------

const ALGO = "aes-256-gcm";

function key(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET || "fox-ai-social-dev-secret-key";
  // Derive a stable 32-byte key from whatever secret is configured.
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string): string {
  if (!plain) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decryptSecret(payload: string | null | undefined): string {
  if (!payload) return "";
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    // Legacy/plain value fallback (used only when reading env-provided keys).
    return payload;
  }
  try {
    const iv = Buffer.from(parts[1], "base64");
    const tag = Buffer.from(parts[2], "base64");
    const data = Buffer.from(parts[3], "base64");
    const decipher = crypto.createDecipheriv(ALGO, key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}
