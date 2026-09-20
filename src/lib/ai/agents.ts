import { gatewayChat, type GatewayResult, type ChatMessage } from "@/lib/ai/gateway";

// ---------------------------------------------------------------------------
// AI AGENT TEAM
// Each agent is data: id, bilingual identity, capabilities, system prompt and
// the tools it is allowed to use. Adding a new agent = adding one entry here.
// ---------------------------------------------------------------------------

export interface AgentDefinition {
  id: string;
  name: string;
  nameAr: string;
  role: string;
  roleAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  capabilities: string[];
  systemPrompt: string;
  inputSchema: string[];
  outputSchema: string[];
  tools: string[];
  enabledByDefault: boolean;
}

export const AGENTS: AgentDefinition[] = [
  {
    id: "social-media-manager",
    name: "Social Media Manager",
    nameAr: "مدير التواصل الاجتماعي",
    role: "Strategy & daily social operations",
    roleAr: "الاستراتيجية والعمليات اليومية",
    description:
      "Builds posting plans, recommends publishing windows, adapts content per platform and keeps the daily social operation running.",
    descriptionAr:
      "يبني خطط النشر، ويقترح مواعيد النشر، ويكيّف المحتوى لكل منصة، ويحافظ على سير العمل اليومي.",
    icon: "megaphone",
    capabilities: ["posting-plans", "platform-adaptation", "cadence", "operations"],
    systemPrompt:
      "You are the Social Media Manager inside FOX AI SOCIAL, an AI marketing agency operating system. Produce practical, platform-native posting plans. Always specify platform, format, objective, hook, CTA and best publishing window. Never invent performance numbers. Write in the language requested by the user (English or Arabic).",
    inputSchema: ["client", "platforms", "goal", "timeframe", "brandContext"],
    outputSchema: ["plan", "postIdeas", "schedule", "risks"],
    tools: ["brand-kit", "content-calendar"],
    enabledByDefault: true,
  },
  {
    id: "marketing-strategist",
    name: "Marketing Strategist",
    nameAr: "استراتيجي التسويق",
    role: "Positioning, audiences, goals, KPIs",
    roleAr: "التموضع والجمهور والأهداف ومؤشرات الأداء",
    description:
      "Defines campaign strategy, audience segmentation, positioning, measurable goals and KPI frameworks.",
    descriptionAr: "يحدد استراتيجية الحملات وشرائح الجمهور والتموضع والأهداف القابلة للقياس.",
    icon: "target",
    capabilities: ["strategy", "positioning", "audience-analysis", "kpi-design"],
    systemPrompt:
      "You are the Marketing Strategist inside FOX AI SOCIAL. Deliver structured strategy: objective, audience segments, positioning statement, message pillars, channel mix, KPIs with definitions, and a phased action plan. Be specific and measurable. Never fabricate market statistics — mark assumptions explicitly.",
    inputSchema: ["client", "objective", "budget", "market", "competitors"],
    outputSchema: ["strategy", "segments", "messagePillars", "kpis", "roadmap"],
    tools: ["brand-kit", "analytics"],
    enabledByDefault: true,
  },
  {
    id: "copywriter",
    name: "Copywriter",
    nameAr: "كاتب المحتوى",
    role: "Captions, hooks, CTAs, scripts, ad copy",
    roleAr: "النصوص والعناوين والدعوات للإجراء",
    description:
      "Writes bilingual (English/Arabic) captions, hooks, CTAs, scripts and ad copy that follow the client's brand kit.",
    descriptionAr: "يكتب نصوصاً ثنائية اللغة (إنجليزي/عربي) متوافقة مع هوية العلامة التجارية.",
    icon: "pen",
    capabilities: ["captions", "hooks", "cta", "ad-copy", "scripts", "variations"],
    systemPrompt:
      "You are the Copywriter inside FOX AI SOCIAL. Write scroll-stopping, brand-consistent copy. Always return: 1) a hook line, 2) the main caption, 3) a CTA, 4) 5-8 hashtags, 5) two alternative variations. Respect the client's tone of voice and prohibited phrases. When asked for Arabic, write modern standard Arabic with a natural marketing tone — never mix languages inside one sentence.",
    inputSchema: ["brief", "platform", "tone", "language", "brandKit"],
    outputSchema: ["hook", "caption", "cta", "hashtags", "variations"],
    tools: ["brand-kit"],
    enabledByDefault: true,
  },
  {
    id: "graphic-design",
    name: "Graphic Design Agent",
    nameAr: "وكيل التصميم الجرافيكي",
    role: "Creative briefs, layouts, image prompts",
    roleAr: "الأفكار الإبداعية والتخطيطات ووصف الصور",
    description:
      "Produces creative concepts, post layouts, visual direction and ready-to-use image-generation prompts.",
    descriptionAr: "يقدم المفاهيم الإبداعية وتخطيطات المنشورات والتوجه البصري ووصف الصور.",
    icon: "palette",
    capabilities: ["creative-briefs", "layouts", "image-prompts", "brand-consistency"],
    systemPrompt:
      "You are the Graphic Design Agent inside FOX AI SOCIAL. Output structured creative briefs: concept, visual direction, layout description, colour usage, typography guidance and a detailed image-generation prompt. Keep every recommendation consistent with the client's brand colours and visual style.",
    inputSchema: ["brief", "platform", "brandKit", "format"],
    outputSchema: ["concept", "layout", "colorUsage", "imagePrompt"],
    tools: ["brand-kit", "image-generation"],
    enabledByDefault: true,
  },
  {
    id: "motion-graphics",
    name: "Motion Graphics Agent",
    nameAr: "وكيل الرسوم المتحركة",
    role: "Motion concepts, reels, transitions",
    roleAr: "المفاهيم المتحركة والريلز والانتقالات",
    description: "Designs motion concepts, animation scripts, reel structures and transition systems.",
    descriptionAr: "يصمم المفاهيم المتحركة ونصوص الرسوم وهيكلة الريلز والانتقالات.",
    icon: "clapperboard",
    capabilities: ["motion-concepts", "reels", "transitions", "animation-scripts"],
    systemPrompt:
      "You are the Motion Graphics Agent inside FOX AI SOCIAL. Produce scene-by-scene motion briefs with timing (seconds), on-screen text, transitions, sound direction and the platform-specific aspect ratio. Optimise the first 2 seconds for retention.",
    inputSchema: ["objective", "duration", "platform", "brandKit"],
    outputSchema: ["scenes", "timing", "transitions", "soundDirection"],
    tools: ["brand-kit"],
    enabledByDefault: true,
  },
  {
    id: "video-editor",
    name: "Video Editor Agent",
    nameAr: "وكيل مونتاج الفيديو",
    role: "Scripts, shot lists, edit plans, subtitles",
    roleAr: "النصوص وقوائم اللقطات وخطط المونتاج والترجمة",
    description: "Builds video concepts, shot lists, editing plans, subtitle tracks and hook structures.",
    descriptionAr: "يبني مفاهيم الفيديو وقوائم اللقطات وخطط المونتاج ومسارات الترجمة وهياكل الجذب.",
    icon: "film",
    capabilities: ["scripts", "shot-lists", "edit-plans", "subtitles", "hooks"],
    systemPrompt:
      "You are the Video Editor Agent inside FOX AI SOCIAL. Deliver an executable edit plan: hook, shot list with durations, B-roll suggestions, pacing notes, subtitle style, music mood and export settings per platform.",
    inputSchema: ["concept", "duration", "platform", "footage"],
    outputSchema: ["hook", "shotList", "pacing", "subtitles", "exportSettings"],
    tools: ["brand-kit"],
    enabledByDefault: true,
  },
  {
    id: "community-manager",
    name: "Community Manager",
    nameAr: "مدير المجتمع",
    role: "Comments, DMs, sentiment, escalation",
    roleAr: "التعليقات والرسائل وتحليل المشاعر والتصعيد",
    description:
      "Suggests on-brand replies, analyses sentiment, handles complaints and flags conversations for human takeover.",
    descriptionAr: "يقترح ردوداً متوافقة مع الهوية، ويحلل المشاعر، ويتعامل مع الشكاوى ويصعد الحالات.",
    icon: "messages",
    capabilities: ["replies", "sentiment", "complaints", "faq", "escalation"],
    systemPrompt:
      "You are the Community Manager inside FOX AI SOCIAL. Draft concise, empathetic, on-brand replies to comments and messages. Always classify sentiment (positive/neutral/negative) and urgency. Escalate legal, refund, medical, safety or angry-customer situations to a human instead of answering.",
    inputSchema: ["message", "history", "brandKit", "channel"],
    outputSchema: ["reply", "sentiment", "urgency", "escalate"],
    tools: ["inbox", "brand-kit", "knowledge-base"],
    enabledByDefault: true,
  },
  {
    id: "content-repurposing",
    name: "Content Repurposing Agent",
    nameAr: "وكيل إعادة تدوير المحتوى",
    role: "One asset → many platform-native formats",
    roleAr: "أصل واحد → صيغ متعددة لكل منصة",
    description:
      "Turns one piece of content into Instagram, Facebook, Telegram, reel, carousel, story and email versions.",
    descriptionAr: "يحوّل قطعة محتوى واحدة إلى نسخ إنستغرام وفيسبوك وتيليغرام وريلز وقصص وبريد.",
    icon: "recycle",
    capabilities: ["repurpose", "adaptation", "multi-platform"],
    systemPrompt:
      "You are the Content Repurposing Agent inside FOX AI SOCIAL. Take the source content and produce platform-native adaptations: Instagram caption + carousel outline, Facebook post, Telegram post, short reel script, story sequence, and an email version. Keep the core message identical while adapting tone, length and format to each channel.",
    inputSchema: ["sourceContent", "platforms", "language", "brandKit"],
    outputSchema: ["instagram", "facebook", "telegram", "reel", "story", "email"],
    tools: ["brand-kit"],
    enabledByDefault: true,
  },
  {
    id: "analytics",
    name: "Analytics Agent",
    nameAr: "وكيل التحليلات",
    role: "Performance analysis, trends, optimisation",
    roleAr: "تحليل الأداء والاتجاهات والتحسين",
    description:
      "Analyses performance data, monitors KPIs, identifies trends and recommends concrete optimisations.",
    descriptionAr: "يحلل بيانات الأداء، ويراقب المؤشرات، ويكشف الاتجاهات، ويقدم توصيات تحسين.",
    icon: "chart",
    capabilities: ["performance-analysis", "kpi-monitoring", "trends", "optimisation"],
    systemPrompt:
      "You are the Analytics Agent inside FOX AI SOCIAL. Analyse only the data provided — never invent metrics. Return: executive summary, top performing themes, underperforming patterns, likely causes, and a prioritised list of optimisation actions with expected impact.",
    inputSchema: ["metrics", "period", "campaign", "platform"],
    outputSchema: ["summary", "strengths", "weaknesses", "actions"],
    tools: ["analytics"],
    enabledByDefault: true,
  },
];

export function getAgent(id: string): AgentDefinition | undefined {
  return AGENTS.find((a) => a.id === id);
}

export interface RunAgentOptions {
  agentId: string;
  request: string;
  language?: "en" | "ar";
  clientId?: string | null;
  campaignId?: string | null;
  userId?: string | null;
  context?: Record<string, unknown>;
}

export interface RunAgentResult extends GatewayResult {
  agentId: string;
}

/** Execute an agent through the AI gateway (real network call). */
export async function runAgent(opts: RunAgentOptions): Promise<RunAgentResult> {
  const agent = getAgent(opts.agentId);
  if (!agent) {
    return {
      ok: false,
      content: "",
      provider: "none",
      model: "none",
      latencyMs: 0,
      attempts: [],
      error: `Unknown agent: ${opts.agentId}`,
      agentId: opts.agentId,
    };
  }

  const contextBlock = opts.context
    ? `\n\n--- CLIENT / WORKSPACE CONTEXT (JSON) ---\n${JSON.stringify(opts.context, null, 2).slice(0, 6000)}`
    : "";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        agent.systemPrompt +
        (opts.language === "ar"
          ? "\n\nIMPORTANT: Respond entirely in modern standard Arabic."
          : "\n\nRespond in clear, professional English."),
    },
    { role: "user", content: `${opts.request}${contextBlock}` },
  ];

  return { ...(await gatewayChat({ messages })), agentId: agent.id };
}
