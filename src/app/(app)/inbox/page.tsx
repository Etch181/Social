"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Inbox as InboxIcon,
  Send,
  Bot,
  UserCheck,
  Pause,
  Play,
  AlertOctagon,
  MessageSquare,
  Tag,
} from "lucide-react";
import { Panel, PanelHeader, Badge, EmptyState, FadeIn, useToast } from "@/components/ui";

interface ConversationRow {
  id: string;
  channel: string;
  customerName: string | null;
  status: string;
  sentiment: string | null;
  escalated: boolean;
  aiPaused: boolean;
  tags: string[];
  lastMessageAt: string;
  clientId: string | null;
}

interface MessageRow {
  id: string;
  role: string;
  content: string;
  channel: string | null;
  createdAt: string;
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [active, setActive] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    const res = await fetch("/api/data?type=conversations&limit=120");
    const data = await res.json();
    if (data.ok) {
      setConversations(data.rows);
      if (!active && data.rows[0]) setActive(data.rows[0]);
    }
  }, [active]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active) return;
    fetch(`/api/data?type=messages&conversationId=${active.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setMessages(d.rows);
      })
      .catch(() => undefined);
  }, [active]);

  const update = async (changes: Record<string, unknown>) => {
    if (!active) return;
    const res = await fetch("/api/system", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "conversation.update", id: active.id, ...changes }),
    });
    if (res.ok) {
      toast.show("Conversation updated");
      load();
    } else {
      toast.show("Update failed", "error");
    }
  };

  const send = async () => {
    if (!active || !reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "conversationMessage",
          conversationId: active.id,
          content: reply,
          role: "agent",
          channel: active.channel,
        }),
      });
      if (!res.ok) {
        toast.show("Failed to send message", "error");
        return;
      }
      setReply("");
      const refreshed = await fetch(`/api/data?type=messages&conversationId=${active.id}`);
      const data = await refreshed.json();
      if (data.ok) setMessages(data.rows);
      toast.show("Reply saved");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-7">
      <FadeIn>
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-px w-8 bg-[var(--c-accent)]" />
            <span className="micro">OMNICHANNEL CUSTOMER CONVERSATIONS</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">Unified Inbox</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Telegram conversations are live today through the bot webhook; Facebook, Instagram and
            WhatsApp channels use the same conversation model and can be enabled as soon as their
            messaging credentials are connected.
          </p>
        </div>
      </FadeIn>

      <div className="grid gap-5 lg:grid-cols-12">
        <Panel pad={false} className="overflow-hidden lg:col-span-4">
          <div className="border-b border-[var(--c-edge)] px-5 py-4">
            <PanelHeader label="CONVERSATIONS" title={`${conversations.length} total`} />
          </div>

          <div className="max-h-[620px] overflow-y-auto">
            {conversations.length === 0 ? (
              <EmptyState
                icon={<InboxIcon size={22} />}
                title="No conversations yet"
                body="Register the Telegram webhook to start receiving customer messages here."
              />
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setActive(conversation)}
                  className={`block w-full border-b border-[var(--c-edge)] px-5 py-4 text-start transition-colors ${
                    active?.id === conversation.id
                      ? "bg-[var(--c-accent-soft)]"
                      : "hover:bg-[var(--c-panel-2)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold text-ink">
                        {conversation.customerName ?? "Unknown customer"}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge tone="info">{conversation.channel}</Badge>
                        {conversation.escalated && <Badge tone="danger">escalated</Badge>}
                        {conversation.aiPaused && <Badge tone="warning">AI paused</Badge>}
                      </div>
                    </div>
                    <div className="num shrink-0 text-[10px] text-muted">
                      {new Date(conversation.lastMessageAt).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </Panel>

        <Panel pad={false} className="overflow-hidden lg:col-span-8">
          {active ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--c-edge)] px-6 py-5">
                <div>
                  <h2 className="text-[16px] font-semibold text-ink">
                    {active.customerName ?? "Conversation"}
                  </h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge tone="info">{active.channel}</Badge>
                    <Badge tone={active.status === "OPEN" ? "success" : "neutral"}>{active.status}</Badge>
                    {active.sentiment && <Badge tone="neutral">{active.sentiment}</Badge>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="btn btn-ghost !px-3 !py-2 !text-xs"
                    onClick={() => update({ aiPaused: !active.aiPaused })}
                  >
                    {active.aiPaused ? <Play size={13} /> : <Pause size={13} />}
                    {active.aiPaused ? "Resume AI" : "Pause AI"}
                  </button>
                  <button
                    className="btn btn-ghost !px-3 !py-2 !text-xs"
                    onClick={() => update({ escalated: !active.escalated })}
                  >
                    <AlertOctagon size={13} /> {active.escalated ? "De-escalate" : "Escalate"}
                  </button>
                  <button
                    className="btn btn-ghost !px-3 !py-2 !text-xs"
                    onClick={() => update({ status: active.status === "CLOSED" ? "OPEN" : "CLOSED" })}
                  >
                    <UserCheck size={13} /> {active.status === "CLOSED" ? "Reopen" : "Close"}
                  </button>
                </div>
              </div>

              <div className="flex h-[460px] flex-col gap-4 overflow-y-auto px-6 py-6">
                {messages.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <MessageSquare size={24} className="text-muted" />
                    <p className="mt-3 text-sm text-muted">No messages in this conversation yet.</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[76%] rounded-2xl px-4 py-3 text-[12.5px] leading-relaxed ${
                          message.role === "user"
                            ? "border border-[var(--c-edge)] bg-[var(--c-panel-2)] text-ink-soft"
                            : message.role === "assistant"
                              ? "bg-[color-mix(in_srgb,var(--c-cyan)_20%,transparent)] text-ink"
                              : "bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent-2)] text-white"
                        }`}
                      >
                        <div className="mb-1.5 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] opacity-70">
                          {message.role === "assistant" ? (
                            <>
                              <Bot size={9} /> AI
                            </>
                          ) : message.role === "user" ? (
                            "Customer"
                          ) : (
                            "Human agent"
                          )}
                        </div>
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        <div className="mt-1.5 text-[9px] opacity-60">
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-[var(--c-edge)] px-6 py-4">
                <div className="flex items-end gap-3">
                  <textarea
                    className="input min-h-[52px] flex-1"
                    placeholder="Write a reply…"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <button className="btn btn-primary" onClick={send} disabled={sending}>
                    <Send size={15} /> {sending ? "Sending…" : "Reply"}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Tag size={12} className="text-muted" />
                  {(active.tags ?? []).length === 0 ? (
                    <span className="text-[11px] text-muted">No tags applied</span>
                  ) : (
                    active.tags.map((tag) => (
                      <Badge key={tag} tone="neutral">
                        {tag}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[420px] items-center justify-center">
              <EmptyState
                icon={<InboxIcon size={22} />}
                title="Select a conversation"
                body="Choose a conversation on the left to view the full message history and reply."
              />
            </div>
          )}
        </Panel>
      </div>

      {toast.node}
    </div>
  );
}
