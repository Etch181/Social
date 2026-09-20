import { SignJWT, importPKCS8 } from "jose";

// ---------------------------------------------------------------------------
// Google Sheets API client (service-account, server-to-server).
// Implemented with direct REST calls + RS256 JWT signing so the app stays
// light-weight and fully server-side. No credentials ever reach the browser.
// ---------------------------------------------------------------------------

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export interface ServiceAccountConfig {
  clientEmail: string;
  privateKey: string;
  spreadsheetId: string;
}

/** Read the service account configuration from environment variables. */
export function getServiceAccount(): ServiceAccountConfig | null {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID || "";
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT || "";

  if (!raw || !spreadsheetId) return null;

  try {
    const json = JSON.parse(raw) as { client_email?: string; private_key?: string };
    if (!json.client_email || !json.private_key) return null;
    return {
      clientEmail: json.client_email,
      privateKey: json.private_key.replace(/\\n/g, "\n"),
      spreadsheetId,
    };
  } catch {
    return null;
  }
}

export function sheetsConfigured(): boolean {
  return Boolean(getServiceAccount());
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(cfg: ServiceAccountConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const now = Math.floor(Date.now() / 1000);
  const key = await importPKCS8(cfg.privateKey, "RS256");
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/spreadsheets",
    iss: cfg.clientEmail,
    aud: TOKEN_URL,
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google OAuth failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function sheetsFetch(cfg: ServiceAccountConfig, path: string, init?: RequestInit) {
  const token = await getAccessToken(cfg);
  const res = await fetch(`${SHEETS_BASE}/${cfg.spreadsheetId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Sheets API ${res.status} on ${path}: ${body.slice(0, 240)}`);
  }
  return res.status === 204 ? null : res.json();
}

/** Worksheet names must be safe: no []:*?/\ characters, unique, <= 90 chars. */
export function sanitizeSheetName(input: string): string {
  const cleaned = input
    .normalize("NFKD")
    .replace(/[\[\]\*\/\?:\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
  return cleaned || "Untitled";
}

export interface SheetTab {
  sheetId: number;
  title: string;
}

export async function listSheets(cfg: ServiceAccountConfig): Promise<SheetTab[]> {
  const data = (await sheetsFetch(cfg, "?fields=sheets.properties")) as {
    sheets?: { properties: SheetTab }[];
  };
  return (data.sheets ?? []).map((s) => s.properties);
}

/** Create a worksheet if it does not exist yet. Returns the safe tab title. */
export async function ensureSheet(cfg: ServiceAccountConfig, title: string): Promise<string> {
  const safe = sanitizeSheetName(title);
  const existing = await listSheets(cfg).catch(() => [] as SheetTab[]);
  if (existing.some((s) => s.title === safe)) return safe;

  await sheetsFetch(cfg, ":batchUpdate", {
    method: "POST",
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: safe } } }],
    }),
  });
  return safe;
}

/** Write a header row + data rows, replacing the given range entirely. */
export async function writeRange(
  cfg: ServiceAccountConfig,
  tab: string,
  values: unknown[][],
  range = "A1",
): Promise<void> {
  const safeTab = sanitizeSheetName(tab);
  await sheetsFetch(cfg, `/values/${encodeURIComponent(`${safeTab}!${range}`)}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values }),
  });
}

export async function readRange(
  cfg: ServiceAccountConfig,
  tab: string,
  range = "A1:Z200",
): Promise<unknown[][]> {
  const safeTab = sanitizeSheetName(tab);
  const data = (await sheetsFetch(
    cfg,
    `/values/${encodeURIComponent(`${safeTab}!${range}`)}`,
  )) as { values?: unknown[][] };
  return data.values ?? [];
}

export async function clearRange(cfg: ServiceAccountConfig, tab: string, range = "A:Z"): Promise<void> {
  const safeTab = sanitizeSheetName(tab);
  await sheetsFetch(cfg, `/values/${encodeURIComponent(`${safeTab}!${range}`)}:clear`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/** Verify credentials + spreadsheet access (used by System Health). */
export async function verifySheetsAccess(): Promise<{ ok: boolean; message: string }> {
  const cfg = getServiceAccount();
  if (!cfg)
    return {
      ok: false,
      message: "Google Sheets not configured — set GOOGLE_SHEETS_ID and GOOGLE_SERVICE_ACCOUNT.",
    };
  try {
    const sheets = await listSheets(cfg);
    return {
      ok: true,
      message: `Connected to spreadsheet with ${sheets.length} worksheet(s).`,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Google Sheets access failed" };
  }
}
