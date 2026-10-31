"use client";

import { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  children,
  className = "",
  action,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-border bg-panel p-4 md:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "profit" | "loss";
}) {
  const toneClass =
    tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-text";
  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 font-mono text-xl font-semibold md:text-2xl ${toneClass}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

export function PlValue({ value, className = "" }: { value: number; className?: string }) {
  const cls = value >= 0 ? "text-profit" : "text-loss";
  return (
    <span className={`font-mono ${cls} ${className}`}>
      {value >= 0 ? "+" : ""}
      {value.toFixed(2)}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "profit" | "loss" | "accent";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-panel-2 text-muted",
    profit: "bg-profit/10 text-profit",
    loss: "bg-loss/10 text-loss",
    accent: "bg-accent/10 text-accent",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
      {label}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-loss/30 bg-loss/5 p-4 text-sm text-loss">{message}</div>
  );
}

export function SetupNotice({ missing }: { missing: string[] }) {
  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
      <h2 className="text-sm font-semibold text-accent">Configuration required</h2>
      <p className="mt-1 text-sm text-muted">
        ManaSimulator needs the following server-side credentials before it can fetch live data. Add them to{" "}
        <code className="rounded bg-panel-2 px-1 py-0.5 font-mono text-xs">.env.local</code> and restart the server.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {missing.map((m) => (
          <li key={m} className="rounded-md border border-border bg-panel px-2.5 py-1 font-mono text-xs text-muted">
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function formatMana(n: number): string {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })} M`;
}

export function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function formatDate(ts?: number | string): string {
  if (!ts) return "—";
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
