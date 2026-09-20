import {
  type PublishAccount,
  type PublishContent,
  type PublishResult,
  type SocialAdapter,
  resolveToken,
  notConfigured,
} from "@/lib/publishing/types";

const TELEGRAM_API = "https://api.telegram.org";

/** Real Telegram Bot API adapter (no mock data — actual HTTP calls). */
export const telegramAdapter: SocialAdapter = {
  platform: "telegram",
  label: "Telegram",
  labelAr: "تيليغرام",
  requiredCredentials: ["TELEGRAM_BOT_TOKEN"],
  supportedContentTypes: ["text", "image", "video", "link"],

  async publish(account: PublishAccount, content: PublishContent): Promise<PublishResult> {
    const token = resolveToken(account) || process.env.TELEGRAM_BOT_TOKEN || "";
    if (!token) return notConfigured("telegram", "TELEGRAM_BOT_TOKEN");
    const chatId = (account.accountId || (account.metadata?.chatId as string) || "").toString();
    if (!chatId)
      return {
        ok: false,
        platform: "telegram",
        error: "No Telegram chat/channel id configured for this account.",
      };

    const media = content.mediaUrls?.filter(Boolean) ?? [];

    try {
      if (media.length) {
        const method = media[0].match(/\.(mp4|mov)$/i) ? "sendVideo" : "sendPhoto";
        const form = new URLSearchParams({
          chat_id: chatId,
          caption: content.text.slice(0, 1024),
        });
        form.append(method === "sendVideo" ? "video" : "photo", media[0]);
        const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
          method: "POST",
          body: form,
        });
        const data = (await res.json()) as { ok: boolean; result?: { message_id: number }; description?: string };
        if (!data.ok) throw new Error(data.description || "Telegram API error");
        return {
          ok: true,
          platform: "telegram",
          externalId: String(data.result?.message_id ?? ""),
          raw: data,
        };
      }

      const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: content.text, parse_mode: "HTML" }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        result?: { message_id: number };
        description?: string;
      };
      if (!data.ok) throw new Error(data.description || "Telegram API error");
      return {
        ok: true,
        platform: "telegram",
        externalId: String(data.result?.message_id ?? ""),
        raw: data,
      };
    } catch (err) {
      return {
        ok: false,
        platform: "telegram",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },

  async healthCheck(account: PublishAccount) {
    const token = resolveToken(account) || process.env.TELEGRAM_BOT_TOKEN || "";
    if (!token) return { ok: false, message: "Telegram bot token not configured." };
    try {
      const res = await fetch(`${TELEGRAM_API}/bot${token}/getMe`);
      const data = (await res.json()) as { ok: boolean; result?: { username: string } };
      return data.ok
        ? { ok: true, message: `Bot @${data.result?.username ?? "bot"} is online.` }
        : { ok: false, message: "Telegram rejected the bot token." };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Telegram unreachable" };
    }
  },
};

export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return false;
  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch(() => null);
  return Boolean(res?.ok);
}

export async function setTelegramWebhook(url: string): Promise<{ ok: boolean; message: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, message: "TELEGRAM_BOT_TOKEN is not set." };
  const res = await fetch(`${TELEGRAM_API}/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, allowed_updates: ["message", "callback_query"] }),
  }).catch(() => null);
  if (!res?.ok) return { ok: false, message: "Failed to reach Telegram API." };
  return { ok: true, message: `Webhook registered: ${url}` };
}
