"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, CircleDot } from "lucide-react";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/markets": "Market Scanner",
  "/analysis": "AI Analysis",
  "/portfolio": "Portfolio",
  "/history": "Trading History",
  "/settings": "Settings",
};

export default function Topbar() {
  const pathname = usePathname();
  const [services, setServices] = useState<{ manifold: boolean; mistral: boolean; supabase: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setServices(d.services))
      .catch(() => setServices(null));
  }, []);

  const title = TITLES[pathname] ?? "ManaSimulator";
  const allOk = services && services.manifold && services.mistral && services.supabase;

  return (
    <header className="flex items-center justify-between border-b border-border bg-panel/60 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <button className="rounded-md p-1.5 text-muted hover:bg-panel-2 md:hidden" aria-label="Menu">
          <Menu size={18} />
        </button>
        <h1 className="text-base font-semibold md:text-lg">{title}</h1>
      </div>
      <div className="flex items-center gap-3 text-xs">
        {services === null ? (
          <span className="text-muted">checking services…</span>
        ) : allOk ? (
          <span className="flex items-center gap-1.5 text-profit">
            <CircleDot size={14} className="pulse-dot" /> All services connected
          </span>
        ) : (
          <Link href="/settings" className="flex items-center gap-1.5 text-loss hover:underline">
            <CircleDot size={14} className="pulse-dot" /> Setup required — configure API keys
          </Link>
        )}
      </div>
    </header>
  );
}
