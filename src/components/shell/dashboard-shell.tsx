"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  PenTool,
  CalendarDays,
  Megaphone,
  CheckCircle2,
  Inbox,
  Share2,
  Bot,
  FlaskConical,
  Cpu,
  BarChart3,
  UserPlus,
  Bell,
  Table2,
  Plug,
  HeartPulse,
  ScrollText,
  Settings,
  ShieldCheck,
  DatabaseBackup,
  BookOpen,
  LogOut,
  Search,
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
  Globe,
  ChevronDown,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { FoxMark } from "@/components/brand/fox-logo";
import { Badge } from "@/components/ui";

interface NavItem {
  href: string;
  labelKey: Parameters<ReturnType<typeof useApp>["t"]>[0];
  icon: React.ComponentType<{ size?: number; className?: string }>;
  group: string;
}

const NAV: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, group: "Command" },
  { href: "/clients", labelKey: "nav.clients", icon: Users, group: "Command" },
  { href: "/content", labelKey: "nav.content", icon: PenTool, group: "Operations" },
  { href: "/calendar", labelKey: "nav.calendar", icon: CalendarDays, group: "Operations" },
  { href: "/campaigns", labelKey: "nav.campaigns", icon: Megaphone, group: "Operations" },
  { href: "/approvals", labelKey: "nav.approvals", icon: CheckCircle2, group: "Operations" },
  { href: "/inbox", labelKey: "nav.inbox", icon: Inbox, group: "Operations" },
  { href: "/social", labelKey: "nav.social", icon: Share2, group: "Channels" },
  { href: "/agents", labelKey: "nav.agents", icon: Bot, group: "Intelligence" },
  { href: "/agent-lab", labelKey: "nav.agentLab", icon: FlaskConical, group: "Intelligence" },
  { href: "/providers", labelKey: "nav.providers", icon: Cpu, group: "Intelligence" },
  { href: "/analytics", labelKey: "nav.analytics", icon: BarChart3, group: "Intelligence" },
  { href: "/leads", labelKey: "nav.leads", icon: UserPlus, group: "Intelligence" },
  { href: "/sheets", labelKey: "nav.sheets", icon: Table2, group: "Platform" },
  { href: "/integrations", labelKey: "nav.integrations", icon: Plug, group: "Platform" },
  { href: "/health", labelKey: "nav.health", icon: HeartPulse, group: "Platform" },
  { href: "/audit", labelKey: "nav.audit", icon: ScrollText, group: "Platform" },
  { href: "/settings", labelKey: "nav.settings", icon: Settings, group: "Administration" },
  { href: "/users", labelKey: "nav.users", icon: ShieldCheck, group: "Administration" },
  { href: "/backup", labelKey: "nav.backup", icon: DatabaseBackup, group: "Administration" },
  { href: "/help", labelKey: "nav.help", icon: BookOpen, group: "Administration" },
];

const MOBILE_NAV = NAV.slice(0, 6);

/* ------------------------------------------------------------- Star field */
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const stars = Array.from({ length: 46 }).map(() => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.5 + 0.3,
      s: Math.random() * 0.00018 + 0.00005,
      a: Math.random() * 0.6 + 0.15,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const star of stars) {
        star.y -= star.s * 100;
        if (star.y < -0.02) star.y = 1.02;
        ctx.beginPath();
        ctx.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(160,180,255,${star.a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reduce]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full opacity-60" aria-hidden />;
}

/* --------------------------------------------------------------- Sidebar */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useApp();

  const groups = Array.from(new Set(NAV.map((n) => n.group)));

  return (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" className="flex items-center gap-3 px-2 pb-6 pt-2" onClick={onNavigate}>
        <FoxMark size={38} />
        <div className="leading-tight">
          <div className="font-display text-[13px] font-bold tracking-[0.18em] text-ink">
            FOX<span className="text-accent"> AI</span>
          </div>
          <div className="micro mt-0.5 text-[9px]">SOCIAL OS</div>
        </div>
      </Link>

      <nav className="flex-1 space-y-5 overflow-y-auto pb-6 pr-1">
        {groups.map((group) => (
          <div key={group}>
            <div className="micro mb-2 px-3 text-[9px] opacity-70">{group.toUpperCase()}</div>
            <div className="space-y-0.5">
              {NAV.filter((n) => n.group === group).map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                      active
                        ? "bg-[var(--c-accent-soft)] text-ink"
                        : "text-muted hover:bg-[var(--c-panel-2)] hover:text-ink"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-y-1 start-0 w-[3px] rounded-full bg-[var(--c-accent)]"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <item.icon
                      size={17}
                      className={`transition-colors ${
                        active ? "text-[var(--c-accent)]" : "text-muted group-hover:text-[var(--c-accent)]"
                      }`}
                    />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

/* --------------------------------------------------------------- Header */
function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ clients: unknown[]; content: unknown[]; campaigns: unknown[] } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const { t } = useApp();

  const runSearch = useCallback(async (value: string) => {
    if (value.trim().length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/data?type=search&q=${encodeURIComponent(value)}`);
      const data = await res.json();
      setResults(data);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="relative hidden w-full max-w-md md:block">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => runSearch(e.target.value), 320);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 180)}
          placeholder={`${t("common.search")}…`}
          aria-label={t("common.search")}
          className="input ps-10"
        />
      </div>

      <AnimatePresence>
        {open && (results || loading) && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="panel-solid absolute inset-x-0 top-[calc(100%+8px)] z-50 max-h-80 overflow-y-auto p-2 shadow-2xl"
          >
            {loading && <div className="px-3 py-4 text-sm text-muted">{t("common.loading")}…</div>}
            {!loading && results && (
              <div className="space-y-1">
                {[
                  ...(results.clients ?? []).map((c) => ({ ...(c as object), _type: "Client" })),
                  ...(results.content ?? []).map((c) => ({ ...(c as object), _type: "Content" })),
                  ...(results.campaigns ?? []).map((c) => ({ ...(c as object), _type: "Campaign" })),
                ].slice(0, 10).map((row, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-[var(--c-panel-2)]"
                  >
                    <span className="truncate text-ink">
                      {String(
                        (row as Record<string, unknown>).title ??
                          (row as Record<string, unknown>).name ??
                          "—",
                      )}
                    </span>
                    <Badge tone="accent">{String((row as Record<string, unknown>)._type)}</Badge>
                  </div>
                ))}
                {results.clients.length + results.content.length + results.campaigns.length === 0 && (
                  <div className="px-3 py-4 text-sm text-muted">No results</div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HeaderControls() {
  const { theme, setTheme, locale, setLocale, t, resolvedTheme } = useApp();
  const [menu, setMenu] = useState<"none" | "theme" | "lang" | "user">("none");
  const [notifications, setNotifications] = useState<number>(0);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/data?type=notifications&limit=1")
      .then((r) => r.json())
      .then((d) => setNotifications(d.unread ?? 0))
      .catch(() => undefined);
  }, []);

  const logout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* theme */}
      <div className="relative">
        <button
          onClick={() => setMenu(menu === "theme" ? "none" : "theme")}
          aria-label={t("common.theme")}
          className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--c-edge)] text-muted transition-colors hover:bg-[var(--c-panel-2)] hover:text-ink"
        >
          {resolvedTheme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <AnimatePresence>
          {menu === "theme" && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="panel-solid absolute end-0 top-[calc(100%+8px)] z-50 w-36 p-1.5"
            >
              {(["dark", "light", "system"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setTheme(mode);
                    setMenu("none");
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    theme === mode ? "bg-[var(--c-accent-soft)] text-ink" : "text-muted hover:bg-[var(--c-panel-2)]"
                  }`}
                >
                  {mode === "dark" ? <Moon size={14} /> : mode === "light" ? <Sun size={14} /> : <Monitor size={14} />}
                  {t(mode === "dark" ? "common.dark" : mode === "light" ? "common.light" : "common.system")}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* language */}
      <div className="relative">
        <button
          onClick={() => setMenu(menu === "lang" ? "none" : "lang")}
          aria-label={t("common.language")}
          className="flex h-9 items-center gap-1.5 rounded-xl border border-[var(--c-edge)] px-3 text-xs font-semibold text-muted transition-colors hover:bg-[var(--c-panel-2)] hover:text-ink"
        >
          <Globe size={15} />
          {locale === "ar" ? "AR" : "EN"}
        </button>
        <AnimatePresence>
          {menu === "lang" && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="panel-solid absolute end-0 top-[calc(100%+8px)] z-50 w-32 p-1.5"
            >
              {(["en", "ar"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    setLocale(l);
                    setMenu("none");
                  }}
                  className={`block w-full rounded-lg px-3 py-2 text-sm transition-colors ${
                    locale === l ? "bg-[var(--c-accent-soft)] text-ink" : "text-muted hover:bg-[var(--c-panel-2)]"
                  }`}
                >
                  {l === "ar" ? "العربية" : "English"}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* notifications */}
      <Link
        href="/notifications"
        aria-label={t("nav.notifications")}
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-[var(--c-edge)] text-muted transition-colors hover:bg-[var(--c-panel-2)] hover:text-ink"
      >
        <Bell size={16} />
        {notifications > 0 && (
          <span className="num absolute -end-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--c-danger)] px-1 text-[9px] font-bold text-white">
            {notifications}
          </span>
        )}
      </Link>

      {/* user */}
      <div className="relative">
        <button
          onClick={() => setMenu(menu === "user" ? "none" : "user")}
          className="flex items-center gap-2 rounded-xl border border-[var(--c-edge)] py-1.5 pe-2 ps-1.5 transition-colors hover:bg-[var(--c-panel-2)]"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent-2)] text-xs font-bold text-white">
            A
          </span>
          <ChevronDown size={14} className="text-muted" />
        </button>
        <AnimatePresence>
          {menu === "user" && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="panel-solid absolute end-0 top-[calc(100%+8px)] z-50 w-48 p-1.5"
            >
              <Link
                href="/settings"
                onClick={() => setMenu("none")}
                className="block rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-[var(--c-panel-2)] hover:text-ink"
              >
                {t("nav.settings")}
              </Link>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--c-danger)] transition-colors hover:bg-[color-mix(in_srgb,var(--c-danger)_12%,transparent)]"
              >
                <LogOut size={14} />
                {t("nav.logout")}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Shell */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { t } = useApp();

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  return (
    <div className="relative min-h-screen">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 grid-field opacity-70" />
        <div className="absolute inset-0 aurora" />
        <StarField />
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[var(--c-accent)] opacity-[0.07] to-transparent" />
      </div>

      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-[248px] border-e border-[var(--c-edge)] bg-[color-mix(in_srgb,var(--c-bg-2)_82%,transparent)] px-4 py-6 backdrop-blur-2xl lg:block">
        <SidebarContent />
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-[rgba(4,7,18,0.6)] backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
            />
            <motion.aside
              className="fixed inset-y-0 start-0 z-[61] w-[264px] overflow-y-auto border-e border-[var(--c-edge)] bg-[var(--c-bg-2)] px-4 py-6 lg:hidden"
              initial={reduce ? { opacity: 0 } : { x: "-100%" }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              <button
                onClick={() => setDrawer(false)}
                className="absolute end-3 top-4 grid h-8 w-8 place-items-center rounded-lg border border-[var(--c-edge)] text-muted"
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
              <SidebarContent onNavigate={() => setDrawer(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* main */}
      <div className="lg:ps-[248px]">
        <header className="sticky top-0 z-30 border-b border-[var(--c-edge)] bg-[color-mix(in_srgb,var(--c-bg)_72%,transparent)] backdrop-blur-2xl">
          <div className="flex h-[68px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setDrawer(true)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--c-edge)] text-muted lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>

            <GlobalSearch />
            <div className="flex-1" />
            <HeaderControls />
          </div>
        </header>

        <main className="px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.24, ease: [0.22, 0.8, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--c-edge)] bg-[color-mix(in_srgb,var(--c-bg-2)_92%,transparent)] px-2 py-2 backdrop-blur-2xl lg:hidden">
        <div className="flex items-center justify-around">
          {MOBILE_NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-lg px-2.5 py-1.5 text-[9px] font-semibold transition-colors ${
                  active ? "text-[var(--c-accent)]" : "text-muted"
                }`}
              >
                <item.icon size={19} />
                <span className="max-w-[58px] truncate">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
