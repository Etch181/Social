import {
  type PublishAccount,
  type PublishContent,
  type PublishResult,
  type SocialAdapter,
  resolveToken,
  notConfigured,
} from "@/lib/publishing/types";

const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * Facebook Pages adapter (Meta Graph API).
 * Requires META_APP_ID / META_APP_SECRET + a Page access token with
 * pages_manage_posts + pages_read_engagement. Tokens are stored encrypted.
 */
export const facebookAdapter: SocialAdapter = {
  platform: "facebook",
  label: "Facebook",
  labelAr: "فيسبوك",
  requiredCredentials: ["META_APP_ID", "META_APP_SECRET", "Page access token"],
  supportedContentTypes: ["text", "image", "video", "link"],

  async publish(account: PublishAccount, content: PublishContent): Promise<PublishResult> {
    const token = resolveToken(account);
    const pageId = account.accountId;
    if (!token || !pageId)
      return notConfigured("facebook", "a Page access token and Page ID (Settings → Integrations → Facebook)");

    const media = content.mediaUrls?.filter(Boolean) ?? [];
    try {
      let endpoint = `${GRAPH}/${pageId}/feed`;
      const body: Record<string, string> = { message: content.text, access_token: token };

      if (content.link) body.link = content.link;

      if (media.length) {
        endpoint = media[0].match(/\.(mp4|mov)$/i)
          ? `${GRAPH}/${pageId}/videos`
          : `${GRAPH}/${pageId}/photos`;
        body.url = media[0];
        body.caption = content.text;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body),
      });
      const data = (await res.json()) as { id?: string; error?: { message?: string } };
      if (data.error) throw new Error(data.error.message || "Facebook Graph API error");

      return {
        ok: true,
        platform: "facebook",
        externalId: data.id,
        externalUrl: data.id ? `https://facebook.com/${data.id}` : undefined,
        raw: data,
      };
    } catch (err) {
      return { ok: false, platform: "facebook", error: err instanceof Error ? err.message : String(err) };
    }
  },

  async healthCheck(account: PublishAccount) {
    const token = resolveToken(account);
    if (!token) return { ok: false, message: "Facebook page token not connected." };
    try {
      const res = await fetch(`${GRAPH}/${account.accountId}?fields=id,name&access_token=${token}`);
      const data = (await res.json()) as { name?: string; error?: { message?: string } };
      return data.error
        ? { ok: false, message: data.error.message || "Facebook token rejected." }
        : { ok: true, message: `Connected to page "${data.name ?? account.accountId}".` };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Facebook unreachable" };
    }
  },
};

/**
 * Instagram Business / Creator adapter (via Meta Graph API).
 * Requires an Instagram Business account connected to a Facebook Page and a
 * token with instagram_content_publish + instagram_basic permissions.
 */
export const instagramAdapter: SocialAdapter = {
  platform: "instagram",
  label: "Instagram",
  labelAr: "إنستغرام",
  requiredCredentials: ["META_APP_ID", "META_APP_SECRET", "Instagram Business account token"],
  supportedContentTypes: ["image", "carousel", "reel", "story"],

  async publish(account: PublishAccount, content: PublishContent): Promise<PublishResult> {
    const token = resolveToken(account);
    const igId = account.accountId;
    if (!token || !igId)
      return notConfigured(
        "instagram",
        "an Instagram Business account ID and access token (Settings → Integrations → Instagram)",
      );

    const media = content.mediaUrls?.filter(Boolean) ?? [];
    if (!media.length)
      return {
        ok: false,
        platform: "instagram",
        error: "Instagram publishing requires at least one public media URL (image or video).",
      };

    try {
      const isVideo = media[0].match(/\.(mp4|mov)$/i);
      const create = await fetch(`${GRAPH}/${igId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          [isVideo ? "video_url" : "image_url"]: media[0],
          caption: content.text,
          access_token: token,
          ...(isVideo ? { media_type: "REELS" } : {}),
        }),
      });
      const created = (await create.json()) as { id?: string; error?: { message?: string } };
      if (created.error) throw new Error(created.error.message || "Instagram media creation failed");

      const publish = await fetch(`${GRAPH}/${igId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ creation_id: created.id as string, access_token: token }),
      });
      const published = (await publish.json()) as { id?: string; error?: { message?: string } };
      if (published.error) throw new Error(published.error.message || "Instagram publish failed");

      return {
        ok: true,
        platform: "instagram",
        externalId: published.id,
        raw: published,
      };
    } catch (err) {
      return { ok: false, platform: "instagram", error: err instanceof Error ? err.message : String(err) };
    }
  },

  async healthCheck(account: PublishAccount) {
    const token = resolveToken(account);
    if (!token) return { ok: false, message: "Instagram token not connected." };
    try {
      const res = await fetch(`${GRAPH}/${account.accountId}?fields=id,username&access_token=${token}`);
      const data = (await res.json()) as { username?: string; error?: { message?: string } };
      return data.error
        ? { ok: false, message: data.error.message || "Instagram token rejected." }
        : { ok: true, message: `Connected to @${data.username ?? account.accountId}.` };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Instagram unreachable" };
    }
  },
};
