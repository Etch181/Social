import { decryptSecret } from "@/lib/crypto";

// ---------------------------------------------------------------------------
// UNIVERSAL PUBLISHING LAYER
// Every channel implements `SocialAdapter`, so the scheduler, automations and
// UI always call the same interface:
//
//   publish(platform, account, content)
//
// Adding TikTok / LinkedIn / YouTube / X / WhatsApp later = adding one adapter.
// ---------------------------------------------------------------------------

export type PlatformId =
  | "facebook"
  | "instagram"
  | "telegram"
  | "tiktok"
  | "linkedin"
  | "youtube"
  | "x"
  | "whatsapp"
  | "email";

export interface PublishAccount {
  id: string;
  platform: string;
  accountName: string | null;
  accountId: string | null;
  /** Encrypted at rest in the database. Decrypted only inside this layer. */
  encryptedAccessToken: string | null;
  metadata: Record<string, unknown>;
}

export interface PublishContent {
  text: string;
  mediaUrls?: string[];
  title?: string;
  link?: string;
  scheduledAt?: Date | null;
}

export interface PublishResult {
  ok: boolean;
  platform: string;
  externalId?: string;
  externalUrl?: string;
  error?: string;
  raw?: unknown;
  skipped?: boolean;
  reason?: string;
}

export interface SocialAdapter {
  platform: PlatformId;
  label: string;
  labelAr: string;
  /** Which credential fields the admin must fill in to activate the channel. */
  requiredCredentials: string[];
  supportedContentTypes: string[];
  publish(account: PublishAccount, content: PublishContent): Promise<PublishResult>;
  healthCheck?(account: PublishAccount): Promise<{ ok: boolean; message: string }>;
}

export function resolveToken(account: PublishAccount): string {
  return decryptSecret(account.encryptedAccessToken);
}

export function notConfigured(platform: string, missing: string): PublishResult {
  return {
    ok: false,
    platform,
    skipped: true,
    reason: "NOT_CONFIGURED",
    error: `The ${platform} adapter is implemented but not connected yet. Required: ${missing}. Connect it under Settings → Integrations.`,
  };
}
