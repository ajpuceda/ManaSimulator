"use client";

import { useEffect, useState } from "react";
import { AlertOctagon, ShieldCheck } from "lucide-react";
import type { OperatingMode } from "@/lib/types";

const MODE_STYLE: Record<OperatingMode, { label: string; cls: string }> = {
  ANALYSIS_ONLY: { label: "MODE 1 · ANALYSIS ONLY — no trading", cls: "border-accent/40 bg-accent/10 text-accent" },
  DRY_RUN: { label: "MODE 2 · DRY RUN — hypothetical trades only", cls: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400" },
  LIVE: { label: "MODE 3 · LIVE MANA — real trades active", cls: "border-loss/40 bg-loss/10 text-loss" },
};

export default function ModeBanner() {
  const [mode, setMode] = useState<OperatingMode | null>(null);
  const [stopped, setStopped] = useState(false);

  const refresh = () => {
    fetch("/api/control")
      .then((r) => r.json())
      .then((d) => {
        setMode(d.mode);
        setStopped(d.emergency_stop);
      })
      .catch(() => {});
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, []);

  const stop = async () => {
    await fetch("/api/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "emergency_stop" }),
    });
    refresh();
  };

  if (!mode) return null;
  const style = MODE_STYLE[mode];

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm ${stopped ? "border-loss/50 bg-loss/10 text-loss" : style.cls}`}>
      <span className="flex items-center gap-2 font-semibold">
        {stopped ? <AlertOctagon size={16} /> : <ShieldCheck size={16} />}
        {stopped ? "EMERGENCY STOP — all trading halted" : style.label}
      </span>
      {!stopped && (
        <button
          onClick={stop}
          className="rounded-md border border-loss/50 bg-loss/10 px-3 py-1 text-xs font-semibold text-loss transition-colors hover:bg-loss/20"
        >
          Emergency STOP
        </button>
      )}
    </div>
  );
}
