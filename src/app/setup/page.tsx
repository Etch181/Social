"use client";

import { useState, type FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { FoxMark } from "@/components/brand/fox-logo";

export default function SetupPage() {
  const router = useRouter();
  const [agencyName, setAgencyName] = useState("FOX AI SOCIAL");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((d) => {
        if (!d.needsSetup) router.replace("/login");
      })
      .catch(() => undefined);
  }, [router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 10) {
      setError("Password must be at least 10 characters long.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agencyName, name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Setup failed");
        return;
      }
      setDone(true);
      window.setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 700);
    } catch {
      setError("Setup failed. Check the server logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <img src="/images/observatory.jpg" alt="" aria-hidden className="h-full w-full object-cover opacity-[0.32]" />
        <div className="absolute inset-0 bg-[var(--c-bg)] opacity-[0.86]" />
        <div className="absolute inset-0 grid-field opacity-60" />
        <div className="absolute inset-0 aurora" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="panel glow-ring p-8 sm:p-10"
        >
          <div className="flex items-center gap-3">
            <FoxMark size={44} />
            <div>
              <div className="font-display text-sm font-bold tracking-[0.22em] text-ink">
                FOX<span className="text-accent"> AI</span> SOCIAL
              </div>
              <div className="micro mt-1">FIRST-RUN SETUP</div>
            </div>
          </div>

          <div className="hairline my-7" />

          <h1 className="text-2xl font-semibold text-ink">Create your administrator account</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            This screen is only available while the platform has no users. Once the administrator is
            created it is permanently disabled — there is no default password shipped with the system.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label className="lbl" htmlFor="agency">
                Agency name
              </label>
              <input
                id="agency"
                className="input"
                required
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="lbl" htmlFor="name">
                  Your name
                </label>
                <input
                  id="name"
                  className="input"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Agency Owner"
                />
              </div>
              <div>
                <label className="lbl" htmlFor="email">
                  Admin email
                </label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@agency.com"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="lbl" htmlFor="password">
                  Password (min. 10 characters)
                </label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  required
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="lbl" htmlFor="confirm">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  className="input"
                  required
                  dir="ltr"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div
                className="flex items-start gap-2.5 rounded-xl border border-[color-mix(in_srgb,var(--c-danger)_36%,transparent)] bg-[color-mix(in_srgb,var(--c-danger)_12%,transparent)] px-4 py-3 text-[13px] text-[var(--c-danger)]"
                role="alert"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading || done} className="btn btn-primary w-full disabled:opacity-70">
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" /> Creating…
                </>
              ) : done ? (
                <>
                  <CheckCircle2 size={16} /> Redirecting…
                </>
              ) : (
                <>
                  <ShieldCheck size={16} /> Create administrator
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-muted">
            <span>Already configured?</span>
            <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-[var(--c-accent)]">
              Go to login <ArrowRight size={13} className="rtl:rotate-180" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
