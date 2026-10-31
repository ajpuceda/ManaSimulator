"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radar,
  BrainCircuit,
  Briefcase,
  History,
  Settings,
  Zap,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/markets", label: "Market Scanner", icon: Radar },
  { href: "/analysis", label: "AI Analysis", icon: BrainCircuit },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/history", label: "Trading History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-panel md:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Zap size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">ManaSimulator</p>
          <p className="text-xs text-muted">AI trading agent</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-accent/10 font-medium text-accent"
                  : "text-muted hover:bg-panel-2 hover:text-text"
              }`}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="px-5 py-4 text-[11px] text-muted">Dry-run mode · no real Mana trades</p>
    </aside>
  );
}
