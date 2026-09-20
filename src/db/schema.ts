import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// FOX AI SOCIAL — PostgreSQL schema (Drizzle ORM)
// All tenant-scoped tables carry a `clientId` and are filtered server-side.
// ---------------------------------------------------------------------------

export const agencies = pgTable("agencies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 180 }).notNull().default("FOX AI SOCIAL"),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  logoUrl: text("logo_url"),
  darkLogoUrl: text("dark_logo_url"),
  lightLogoUrl: text("light_logo_url"),
  faviconUrl: text("favicon_url"),
  website: text("website"),
  contactEmail: varchar("contact_email", { length: 190 }),
  contactPhone: varchar("contact_phone", { length: 60 }),
  timezone: varchar("timezone", { length: 80 }).notNull().default("UTC"),
  defaultLanguage: varchar("default_language", { length: 5 }).notNull().default("en"),
  accentColor: varchar("accent_color", { length: 32 }).notNull().default("#7C4DFF"),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "cascade" }),
    clientId: uuid("client_id"),
    email: varchar("email", { length: 190 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    role: varchar("role", { length: 24 }).notNull().default("STAFF"), // ADMIN | STAFF | CLIENT
    status: varchar("status", { length: 24 }).notNull().default("ACTIVE"),
    avatarUrl: text("avatar_url"),
    locale: varchar("locale", { length: 5 }).notNull().default("en"),
    permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    ip: varchar("ip", { length: 64 }),
    remember: boolean("remember").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_token_hash_idx").on(t.tokenHash)],
);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 180 }).notNull(),
    brandName: varchar("brand_name", { length: 180 }),
    logoUrl: text("logo_url"),
    industry: varchar("industry", { length: 120 }),
    description: text("description"),
    website: text("website"),
    contactName: varchar("contact_name", { length: 160 }),
    contactEmail: varchar("contact_email", { length: 190 }),
    contactPhone: varchar("contact_phone", { length: 60 }),
    country: varchar("country", { length: 90 }),
    timezone: varchar("timezone", { length: 80 }).notNull().default("UTC"),
    language: varchar("language", { length: 5 }).notNull().default("en"),
    status: varchar("status", { length: 24 }).notNull().default("ACTIVE"), // ACTIVE | PAUSED | ARCHIVED
    sheetTabName: varchar("sheet_tab_name", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("clients_agency_idx").on(t.agencyId)],
);

export const brandKits = pgTable("brand_kits", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  primaryColors: jsonb("primary_colors").$type<string[]>().notNull().default([]),
  secondaryColors: jsonb("secondary_colors").$type<string[]>().notNull().default([]),
  fonts: varchar("fonts", { length: 190 }),
  tone: varchar("tone", { length: 120 }),
  languageStyle: varchar("language_style", { length: 120 }),
  hashtags: jsonb("hashtags").$type<string[]>().notNull().default([]),
  targetAudience: text("target_audience"),
  brandDescription: text("brand_description"),
  prohibitedPhrases: jsonb("prohibited_phrases").$type<string[]>().notNull().default([]),
  preferredCta: varchar("preferred_cta", { length: 190 }),
  visualStyle: text("visual_style"),
  contentExamples: text("content_examples"),
  guidelines: text("guidelines"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const socialAccounts = pgTable(
  "social_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 32 }).notNull(), // facebook | instagram | telegram | ...
    accountName: varchar("account_name", { length: 180 }),
    accountId: varchar("account_id", { length: 120 }),
    accountType: varchar("account_type", { length: 40 }),
    status: varchar("status", { length: 24 }).notNull().default("DISCONNECTED"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    encryptedAccessToken: text("encrypted_access_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("social_accounts_client_idx").on(t.clientId)],
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 180 }).notNull(),
    objective: text("objective"),
    targetAudience: text("target_audience"),
    platforms: jsonb("platforms").$type<string[]>().notNull().default([]),
    budget: numeric("budget", { precision: 14, scale: 2 }),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    strategy: text("strategy"),
    kpis: jsonb("kpis").$type<Record<string, unknown>>().notNull().default({}),
    status: varchar("status", { length: 24 }).notNull().default("STRATEGY"),
    agentIds: jsonb("agent_ids").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("campaigns_client_idx").on(t.clientId)],
);

export const contentItems = pgTable(
  "content_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    title: varchar("title", { length: 220 }).notNull(),
    body: text("body").notNull().default(""),
    cta: varchar("cta", { length: 220 }),
    hashtags: jsonb("hashtags").$type<string[]>().notNull().default([]),
    platform: varchar("platform", { length: 32 }).notNull().default("instagram"),
    contentType: varchar("content_type", { length: 32 }).notNull().default("post"),
    language: varchar("language", { length: 5 }).notNull().default("en"),
    mediaUrls: jsonb("media_urls").$type<string[]>().notNull().default([]),
    status: varchar("status", { length: 24 }).notNull().default("DRAFT"),
    approvalStatus: varchar("approval_status", { length: 24 }).notNull().default("NOT_REQUESTED"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishResult: jsonb("publish_result").$type<Record<string, unknown>>(),
    aiAgentId: varchar("ai_agent_id", { length: 64 }),
    generatedBy: varchar("generated_by", { length: 64 }),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("content_client_idx").on(t.clientId),
    index("content_scheduled_idx").on(t.scheduledAt),
  ],
);

export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    requestedBy: uuid("requested_by"),
    status: varchar("status", { length: 24 }).notNull().default("PENDING"),
    decisionNote: text("decision_note"),
    decidedBy: uuid("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("approvals_client_idx").on(t.clientId)],
);

export const aiProviders = pgTable("ai_providers", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  type: varchar("type", { length: 40 }).notNull().default("openai-compatible"),
  baseUrl: text("baseUrl").notNull(),
  apiKeyEncrypted: text("api_key_encrypted"),
  model: varchar("model", { length: 120 }).notNull(),
  timeoutMs: integer("timeout_ms").notNull().default(60000),
  maxRetries: integer("max_retries").notNull().default(1),
  enabled: boolean("enabled").notNull().default(false),
  priority: integer("priority").notNull().default(10),
  status: varchar("status", { length: 24 }).notNull().default("NOT_CONFIGURED"),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastError: text("last_error"),
  lastLatencyMs: integer("last_latency_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: varchar("agent_id", { length: 64 }).notNull(),
    clientId: uuid("client_id"),
    campaignId: uuid("campaign_id"),
    userId: uuid("user_id"),
    prompt: text("prompt"),
    result: text("result"),
    provider: varchar("provider", { length: 80 }),
    model: varchar("model", { length: 120 }),
    status: varchar("status", { length: 24 }).notNull().default("SUCCESS"),
    durationMs: integer("duration_ms"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("agent_runs_agent_idx").on(t.agentId)],
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
    channel: varchar("channel", { length: 32 }).notNull().default("telegram"),
    customerName: varchar("customer_name", { length: 160 }),
    customerExternalId: varchar("customer_external_id", { length: 120 }),
    status: varchar("status", { length: 24 }).notNull().default("OPEN"),
    assignedTo: uuid("assigned_to"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    sentiment: varchar("sentiment", { length: 24 }),
    escalated: boolean("escalated").notNull().default(false),
    aiPaused: boolean("ai_paused").notNull().default(false),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("conversations_client_idx").on(t.clientId)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 24 }).notNull().default("user"),
    content: text("content").notNull(),
    channel: varchar("channel", { length: 32 }),
    externalId: varchar("external_id", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId)],
);

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  contact: varchar("contact", { length: 190 }),
  source: varchar("source", { length: 64 }).notNull().default("manual"),
  status: varchar("status", { length: 24 }).notNull().default("NEW"),
  value: numeric("value", { precision: 14, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id"),
    type: varchar("type", { length: 48 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body"),
    link: text("link"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id"),
    action: varchar("action", { length: 80 }).notNull(),
    entityType: varchar("entity_type", { length: 60 }),
    entityId: varchar("entity_id", { length: 64 }),
    clientId: uuid("client_id"),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    ip: varchar("ip", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_action_idx").on(t.action)],
);

export const syncRuns = pgTable("sync_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: varchar("kind", { length: 40 }).notNull().default("google-sheets"),
  status: varchar("status", { length: 24 }).notNull().default("SUCCESS"),
  recordsSynced: integer("records_synced").notNull().default(0),
  durationMs: integer("duration_ms"),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
});

export const systemSettings = pgTable("system_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type ContentItem = typeof contentItems.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type SocialAccount = typeof socialAccounts.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type AgentRun = typeof agentRuns.$inferSelect;
export type AiProvider = typeof aiProviders.$inferSelect;
