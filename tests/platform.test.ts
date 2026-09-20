import { describe, it, expect } from "vitest";
import {
  encryptSecret,
  decryptSecret,
  sha256,
  randomToken,
} from "@/lib/crypto";
import { dictionaries, t, isRtl } from "@/lib/i18n";
import { sanitizeSheetName } from "@/lib/sheets/google";
import { AGENTS, getAgent, runAgent } from "@/lib/ai/agents";
import { adapters, PLATFORM_CATALOG, getAdapter } from "@/lib/publishing";
import { notConfigured, type PublishAccount } from "@/lib/publishing/types";

describe("encryption layer", () => {
  it("round-trips a secret through AES-256-GCM", () => {
    const secret = "EAAG…meta-page-token-123456";
    const encrypted = encryptSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(encrypted.startsWith("v1.")).toBe(true);
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it("produces different ciphertext for identical input (random IV)", () => {
    const a = encryptSecret("same-input");
    const b = encryptSecret("same-input");
    expect(a).not.toEqual(b);
    expect(decryptSecret(a)).toEqual(decryptSecret(b));
  });

  it("returns empty string for malformed ciphertext", () => {
    expect(decryptSecret("v1.notbase64.atall.junk")).toBe("");
    expect(decryptSecret("")).toBe("");
    expect(decryptSecret(undefined)).toBe("");
  });

  it("hashes deterministically and generates random tokens", () => {
    expect(sha256("abc")).toBe(sha256("abc"));
    expect(sha256("abc")).not.toBe(sha256("abd"));
    expect(randomToken(16)).not.toEqual(randomToken(16));
  });
});

describe("internationalisation", () => {
  it("keeps the Arabic dictionary complete for every English key", () => {
    const enKeys = Object.keys(dictionaries.en);
    const arKeys = Object.keys(dictionaries.ar);
    const missing = enKeys.filter((k) => !arKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it("resolves translations and falls back to English", () => {
    expect(t("en", "nav.dashboard")).toBe("Dashboard");
    expect(t("ar", "nav.dashboard")).toBe("لوحة التحكم");
    // @ts-expect-error intentionally invalid key must not throw
    expect(t("en", "does.not.exist")).toBe("does.not.exist");
  });

  it("marks Arabic as RTL and English as LTR", () => {
    expect(isRtl("ar")).toBe(true);
    expect(isRtl("en")).toBe(false);
  });
});

describe("google sheets helpers", () => {
  it("sanitises unsafe worksheet names", () => {
    expect(sanitizeSheetName("Client [A]/B:C")).toBe("Client A B C");
    expect(sanitizeSheetName("   ")).toBe("Untitled");
    expect(sanitizeSheetName("a".repeat(200)).length).toBeLessThanOrEqual(90);
  });
});

describe("ai agent registry", () => {
  it("exposes the nine required agents with unique ids", () => {
    expect(AGENTS).toHaveLength(9);
    const ids = AGENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of [
      "social-media-manager",
      "marketing-strategist",
      "copywriter",
      "graphic-design",
      "motion-graphics",
      "video-editor",
      "community-manager",
      "content-repurposing",
      "analytics",
    ]) {
      expect(ids).toContain(id);
    }
  });

  it("gives every agent bilingual identity, prompt, schemas and tools", () => {
    for (const agent of AGENTS) {
      expect(agent.name.length).toBeGreaterThan(2);
      expect(agent.nameAr.length).toBeGreaterThan(2);
      expect(agent.systemPrompt.length).toBeGreaterThan(80);
      expect(agent.inputSchema.length).toBeGreaterThan(0);
      expect(agent.outputSchema.length).toBeGreaterThan(0);
      expect(agent.tools.length).toBeGreaterThan(0);
    }
  });

  it("resolves agents by id and rejects unknown agents", async () => {
    expect(getAgent("copywriter")?.name).toBe("Copywriter");
    const result = await runAgent({ agentId: "missing-agent", request: "hello" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Unknown agent");
  });
});

describe("publishing adapters", () => {
  it("registers the three live adapters", () => {
    expect(Object.keys(adapters).sort()).toEqual(["facebook", "instagram", "telegram"]);
    expect(getAdapter("telegram")?.platform).toBe("telegram");
    expect(getAdapter("tiktok")).toBeUndefined();
  });

  it("keeps future channels in the platform catalog as extension points", () => {
    const ids = PLATFORM_CATALOG.map((p) => p.id);
    for (const id of ["tiktok", "linkedin", "youtube", "x", "whatsapp", "email"]) {
      expect(ids).toContain(id);
    }
    const future = PLATFORM_CATALOG.find((p) => p.id === "tiktok");
    expect(future?.implemented).toBe(false);
    expect(future?.requiredCredentials.length).toBeGreaterThan(0);
  });

  it("returns an explicit NOT_CONFIGURED result instead of a fake success", async () => {
    const account: PublishAccount = {
      id: "acc-1",
      platform: "facebook",
      accountName: null,
      accountId: null,
      encryptedAccessToken: null,
      metadata: {},
    };
    const result = await adapters.facebook.publish(account, { text: "hello" });
    expect(result.ok).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("NOT_CONFIGURED");
    expect(result.error).toMatch(/not connected/i);
  });

  it("builds a helpful notConfigured message", () => {
    const result = notConfigured("instagram", "a token");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("a token");
  });
});
