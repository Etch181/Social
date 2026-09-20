import { db } from "@/db";
import { conversations, messages, clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { audit, notify } from "@/lib/audit";
import { sendTelegramMessage } from "@/lib/publishing/telegram";
import { runAgent } from "@/lib/ai/agents";

/**
 * Telegram incoming webhook.
 * Register it with: POST /api/system { action: "telegram.webhook" }
 * (uses APP_URL + TELEGRAM_BOT_TOKEN from the environment).
 */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers.get("x-telegram-bot-api-secret-token");
    if (provided !== secret) return new Response("Forbidden", { status: 403 });
  }

  const update = (await req.json().catch(() => null)) as {
    message?: {
      chat?: { id?: number; username?: string; first_name?: string };
      from?: { id?: number; first_name?: string; username?: string };
      text?: string;
      message_id?: number;
    };
  };

  const text = update?.message?.text?.trim();
  const chatId = update?.message?.chat?.id ? String(update.message.chat.id) : null;

  if (!chatId) return Response.json({ ok: true, skipped: true });

  await audit({
    action: "telegram.message_received",
    entityType: "conversation",
    details: { chatId: chatId.slice(0, 6) + "***", command: text?.slice(0, 30) ?? null },
  });

  // ---- Bot commands -----------------------------------------------------
  if (text?.startsWith("/")) {
    const command = text.split(" ")[0].toLowerCase();
    const replies: Record<string, string> = {
      "/start":
        "Welcome to FOX AI SOCIAL 👋\nI can answer questions, share updates and connect you with a human agent.\n\nCommands: /help /status /contact /agent",
      "/help":
        "Available commands:\n/start — restart the bot\n/help — this message\n/status — system status\n/contact — reach a human agent\n/agent — ask the AI assistant",
      "/status": "All FOX AI SOCIAL systems are operational.",
      "/contact": "A human agent will join this conversation shortly.",
      "/agent": "Please type your question after this message and the AI assistant will reply.",
    };
    if (replies[command]) await sendTelegramMessage(chatId, replies[command]);
    return Response.json({ ok: true, command });
  }

  if (!text) return Response.json({ ok: true, skipped: true });

  // ---- Persist / extend the conversation -------------------------------
  let [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.channel, "telegram"), eq(conversations.customerExternalId, chatId)))
    .limit(1);

  if (!conversation) {
    const [client] = await db.select().from(clients).limit(1);
    [conversation] = await db
      .insert(conversations)
      .values({
        channel: "telegram",
        customerExternalId: chatId,
        customerName:
          [update?.message?.from?.first_name, update?.message?.from?.username].filter(Boolean).join(" @") ||
          `Telegram user ${chatId.slice(0, 6)}`,
        clientId: client?.id ?? null,
        status: "OPEN",
        lastMessageAt: new Date(),
      })
      .returning();
    await notify({
      type: "conversation.created",
      title: "New Telegram conversation",
      body: text.slice(0, 120),
      link: "/inbox",
    });
  }

  await db.insert(messages).values({
    conversationId: conversation.id,
    role: "user",
    content: text.slice(0, 4000),
    channel: "telegram",
    externalId: update?.message?.message_id ? String(update.message.message_id) : null,
  });

  // ---- AI auto-reply (skipped when a human has taken over) -------------
  if (conversation.aiPaused || conversation.escalated) {
    return Response.json({ ok: true, aiPaused: true });
  }

  const ai = await runAgent({
    agentId: "community-manager",
    request: `Customer message on Telegram:\n\n"${text}"\n\nWrite a helpful, concise reply (max 90 words).`,
    language: "en",
    clientId: conversation.clientId,
    context: { channel: "telegram", customer: conversation.customerName },
  });

  if (ai.ok && ai.content) {
    await db.insert(messages).values({
      conversationId: conversation.id,
      role: "assistant",
      content: ai.content.slice(0, 4000),
      channel: "telegram",
    });
    await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversation.id));
    await sendTelegramMessage(chatId, ai.content.slice(0, 3800));
    await audit({
      action: "telegram.ai_reply",
      entityType: "conversation",
      entityId: conversation.id,
      clientId: conversation.clientId,
      details: { provider: ai.provider, model: ai.model },
    });
  }

  return Response.json({ ok: true, replied: ai.ok });
}

export async function GET() {
  return Response.json({
    ok: true,
    configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    webhookUrl: `${process.env.APP_URL ?? ""}/api/telegram/webhook`,
    commands: ["/start", "/help", "/status", "/contact", "/agent"],
  });
}
