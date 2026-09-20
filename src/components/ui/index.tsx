"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { X, ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ Panel */
export function Panel({
  children,
  className = "",
  pad = true,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
  hover?: boolean;
}) {
  return (
    <div
      className={`panel ${pad ? "p-5 sm:p-6" : ""} ${
        hover ? "transition-all duration-300 hover:-translate-y-1 hover:border-[var(--c-accent)] hover:shadow-[0_28px_70px_-32px_var(--c-glow)]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------- Panel head */
export function PanelHeader({
  label,
  title,
  action,
  className = "",
}: {
  label: string;
  title?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <span className="h-px w-6 bg-[var(--c-accent)]" />
          <span className="micro">{label}</span>
        </div>
        {title && <h3 className="mt-2 truncate text-lg font-semibold text-ink">{title}</h3>}
      </div>
      {action}
    </div>
  );
}

/* --------------------------------------------------------------- Badges */
const badgeTones: Record<string, string> = {
  neutral: "bg-[var(--c-panel-2)] text-[var(--c-muted)] border-[var(--c-edge)]",
  success:
    "bg-[color-mix(in_srgb,var(--c-success)_14%,transparent)] text-[var(--c-success)] border-[color-mix(in_srgb,var(--c-success)_36%,transparent)]",
  warning:
    "bg-[color-mix(in_srgb,var(--c-amber)_16%,transparent)] text-[var(--c-amber)] border-[color-mix(in_srgb,var(--c-amber)_36%,transparent)]",
  danger:
    "bg-[color-mix(in_srgb,var(--c-danger)_14%,transparent)] text-[var(--c-danger)] border-[color-mix(in_srgb,var(--c-danger)_34%,transparent)]",
  accent:
    "bg-[var(--c-accent-soft)] text-[var(--c-accent)] border-[color-mix(in_srgb,var(--c-accent)_38%,transparent)]",
  info: "bg-[color-mix(in_srgb,var(--c-cyan)_13%,transparent)] text-[var(--c-cyan)] border-[color-mix(in_srgb,var(--c-cyan)_34%,transparent)]",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: keyof typeof badgeTones | string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
        badgeTones[tone] ?? badgeTones.neutral
      } ${className}`}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------- Stat card */
export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "accent",
  delta,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "accent" | "cyan" | "amber" | "success" | "danger";
  delta?: number;
}) {
  const toneRing: Record<string, string> = {
    accent: "text-[var(--c-accent)] bg-[var(--c-accent-soft)]",
    cyan: "text-[var(--c-cyan)] bg-[color-mix(in_srgb,var(--c-cyan)_13%,transparent)]",
    amber: "text-[var(--c-amber)] bg-[color-mix(in_srgb,var(--c-amber)_14%,transparent)]",
    success: "text-[var(--c-success)] bg-[color-mix(in_srgb,var(--c-success)_13%,transparent)]",
    danger: "text-[var(--c-danger)] bg-[color-mix(in_srgb,var(--c-danger)_13%,transparent)]",
  };
  return (
    <div className="panel group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--c-accent)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--c-accent)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="micro truncate">{label}</div>
          <div className="num mt-2.5 text-[28px] font-semibold leading-none text-ink">{value}</div>
          {hint && <div className="mt-2 text-xs text-muted">{hint}</div>}
          {typeof delta === "number" && (
            <div
              className={`num mt-2 text-xs font-semibold ${
                delta >= 0 ? "text-[var(--c-success)]" : "text-[var(--c-danger)]"
              }`}
            >
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
            </div>
          )}
        </div>
        {icon && (
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneRing[tone]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Empty state */
export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="relative mb-6 grid h-20 w-20 place-items-center rounded-2xl border border-[var(--c-edge)] bg-[var(--c-panel-2)] text-[var(--c-accent)]">
        <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_20%,var(--c-glow),transparent_70%)] opacity-60" />
        <div className="relative">{icon ?? <Sparkles size={26} />}</div>
      </div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {body && <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{body}</p>}
      {actionLabel && (
        <button className="btn btn-primary mt-6" onClick={onAction}>
          {actionLabel}
          <ArrowRight size={16} className="rtl:rotate-180" />
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- Skeleton */
export function Skeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-3.5" style={{ width: `${100 - i * 12}%` }} />
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- Modal */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const reduce = useReducedMotion();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-[rgba(4,7,18,0.72)] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`panel-solid relative flex max-h-[92vh] w-full flex-col overflow-hidden ${
              wide ? "sm:max-w-3xl" : "sm:max-w-lg"
            }`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            <div className="flex items-center justify-between gap-4 border-b border-[var(--c-edge)] px-6 py-4">
              <h3 className="text-base font-semibold text-ink">{title}</h3>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--c-edge)] text-muted transition-colors hover:bg-[var(--c-panel-2)] hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && (
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--c-edge)] px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------ Page fade */
export function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay, ease: [0.22, 0.8, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ----------------------------------------------------------- Counter */
export function Counter({ to, duration = 1100 }: { to: number; duration?: number }) {
  const [value, setValue] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      setValue(to);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(to * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, duration, reduce]);

  return <>{value.toLocaleString()}</>;
}

/* --------------------------------------------------------------- Toast */
export function useToast() {
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  const show = (text: string, tone: "success" | "error" = "success") => {
    setMessage({ text, tone });
    window.setTimeout(() => setMessage(null), 3200);
  };

  const node = (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className={`fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-xl border px-5 py-3 text-sm font-medium shadow-2xl ${
            message.tone === "success"
              ? "border-[var(--c-success)] bg-[color-mix(in_srgb,var(--c-success)_18%,var(--c-panel-solid))] text-ink"
              : "border-[var(--c-danger)] bg-[color-mix(in_srgb,var(--c-danger)_18%,var(--c-panel-solid))] text-ink"
          }`}
        >
          {message.text}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return { show, node };
}
