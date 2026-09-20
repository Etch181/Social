"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { FoxMark } from "@/components/brand/fox-logo";
import { useApp } from "@/components/providers/app-provider";

export default function LoginPage() {
  const router = useRouter();
  const { t, locale, setLocale, theme, setTheme, resolvedTheme } = useApp();
  const reduce = useReducedMotion();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((d) => setNeedsSetup(Boolean(d.needsSetup)))
      .catch(() => undefined);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password, remember }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error === "auth.invalid" ? t("auth.invalid") : data?.error ?? t("common.error"));
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* animated ambient background */}
      <div className="absolute inset-0">
        <img
          src="/images/observatory.jpg"
          alt=""
          aria-hidden
          className="h-full w-full object-cover opacity-[0.42]"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="absolute inset-0 bg-[var(--c-bg)] opacity-[0.82]" />
        <div className="absolute inset-0 grid-field opacity-60" />
        <div className="absolute inset-0 aurora" />
        {!reduce && (
          <motion.div
            className="absolute -inset-32 opacity-60"
            animate={{ rotate: 360 }}
            transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
            style={{
              background:
                "conic-gradient(from 0deg at 50% 50%, transparent 0deg, var(--c-accent-soft) 60deg, transparent 130deg, var(--c-accent-soft) 220deg, transparent 320deg)",
            }}
          />
        )}
      </div>

      {/* top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <div className="flex items-center gap-3">
          <FoxMark size={38} />
          <div>
            <div className="font-display text-sm font-bold tracking-[0.22em] text-ink">
              FOX<span className="text-accent"> AI</span> SOCIAL
            </div>
            <div className="micro mt-1 text-[9px]">{t("app.tagline")}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            className="rounded-xl border border-[var(--c-edge)] px-3.5 py-2 text-xs font-semibold text-muted transition-colors hover:bg-[var(--c-panel-2)] hover:text-ink"
          >
            {locale === "ar" ? "English" : "العربية"}
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-xl border border-[var(--c-edge)] px-3.5 py-2 text-xs font-semibold text-muted transition-colors hover:bg-[var(--c-panel-2)] hover:text-ink"
            aria-label={t("common.theme")}
          >
            {resolvedTheme === "dark" ? "☀" : "☾"}
          </button>
        </div>
      </div>

      {/* content */}
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-12 px-6 pb-16 lg:flex-row lg:items-start lg:justify-between">
        {/* brand column */}
        <motion.div
          className="hidden max-w-md flex-1 pt-6 lg:block"
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 0.8, 0.3, 1] }}
        >
          <h1 className="text-[46px] font-semibold leading-[1.03] tracking-[-0.03em] text-ink">
            <span className="text-grad">Agency operations,</span>
            <br />
            engineered for AI.
          </h1>
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-muted">
            One command center for content, approvals, publishing, analytics and every client
            workspace — with a real multi-provider AI gateway underneath.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { k: "Multi-tenant isolation", v: "Per-client encrypted workspaces" },
              { k: "AI provider gateway", v: "OmniRoute · Arena.ai · OpenRouter" },
              { k: "Universal publishing", v: "Facebook · Instagram · Telegram" },
            ].map((row, i) => (
              <motion.div
                key={row.k}
                className="flex items-center gap-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.12 }}
              >
                <span className="h-px w-9 bg-[var(--c-accent)]" />
                <div>
                  <div className="text-[13px] font-semibold text-ink">{row.k}</div>
                  <div className="text-xs text-muted">{row.v}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* form */}
        <motion.div
          className="panel glow-ring w-full max-w-[420px] p-8"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 0.8, 0.3, 1] }}
        >
          {needsSetup ? (
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--c-accent-soft)] text-[var(--c-accent)]">
                <ShieldCheck size={24} />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-ink">{t("auth.setupTitle")}</h2>
              <p className="mt-2 text-sm text-muted">{t("auth.setupSubtitle")}</p>
              <Link href="/setup" className="btn btn-primary mt-6 w-full">
                {t("auth.createAdmin")}
                <ArrowRight size={16} className="rtl:rotate-180" />
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <span className="h-px w-7 bg-[var(--c-accent)]" />
                <span className="micro">SECURE ACCESS</span>
              </div>
              <h2 className="mt-3 text-2xl font-semibold leading-tight text-ink">{t("auth.signIn")}</h2>

              <form onSubmit={submit} className="mt-7 space-y-5">
                <div>
                  <label className="lbl" htmlFor="email">
                    {t("auth.email")}
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="admin@agency.com"
                  />
                </div>

                <div>
                  <label className="lbl" htmlFor="password">
                    {t("auth.password")}
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input pe-11"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-ink"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2.5 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--c-edge)] accent-[var(--c-accent)]"
                  />
                  {t("auth.remember")}
                </label>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start gap-2.5 rounded-xl border border-[color-mix(in_srgb,var(--c-danger)_36%,transparent)] bg-[color-mix(in_srgb,var(--c-danger)_12%,transparent)] px-4 py-3 text-[13px] text-[var(--c-danger)]"
                      role="alert"
                    >
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button type="submit" disabled={loading} className="btn btn-primary w-full disabled:opacity-70">
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      {t("auth.signingIn")}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      {t("auth.signIn")}
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="hairline my-7" />
          <div className="flex items-center justify-center gap-2 text-[11px] text-muted">
            <ShieldCheck size={13} className="text-[var(--c-success)]" />
            <span>Encrypted sessions · bcrypt password hashing · rate limiting</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
