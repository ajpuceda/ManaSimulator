"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, StatCard, PlValue, Spinner, ErrorBox, SetupNotice, Badge, formatMana } from "@/components/ui";
import type { DashboardStats, Position, Trade } from "@/lib/types";

interface DashboardResponse {
  stats: DashboardStats;
  positions: Position[];
  recentTrades: Trade[];
  services: { manifold: boolean; mistral: boolean; supabase: boolean };
  missing: string[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to load dashboard");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Spinner label="Loading dashboard…" />;
  if (data.missing.length > 0) return <SetupNotice missing={data.missing} />;

  const { stats, recentTrades } = data;
  const chartData = [
    { t: "Start", v: stats.total_balance },
    ...recentTrades.slice(0, 10).map((t, i) => ({
      t: new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      v: stats.portfolio_value - stats.total_pl + i * 0,
    })),
    { t: "Now", v: stats.portfolio_value },
  ];

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard label="Total Mana balance" value={formatMana(stats.total_balance)} />
        <StatCard label="Portfolio value" value={formatMana(stats.portfolio_value)} />
        <StatCard
          label="Total P/L"
          value={`${stats.total_pl >= 0 ? "+" : ""}${stats.total_pl.toFixed(2)} M`}
          tone={stats.total_pl >= 0 ? "profit" : "loss"}
        />
        <StatCard
          label="Daily P/L"
          value={`${stats.daily_pl >= 0 ? "+" : ""}${stats.daily_pl.toFixed(2)} M`}
          tone={stats.daily_pl >= 0 ? "profit" : "loss"}
        />
        <StatCard label="ROI" value={`${stats.roi_pct.toFixed(2)}%`} tone={stats.roi_pct >= 0 ? "profit" : "loss"} />
        <StatCard label="Open positions" value={String(stats.open_positions)} />
        <StatCard label="Total trades" value={String(stats.total_trades)} />
        <StatCard label="Win rate" value={`${stats.win_rate.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
        <Card title="Portfolio performance" subtitle="Virtual Mana over time" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="pl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2fd27d" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2fd27d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1c2534" vertical={false} />
                <XAxis dataKey="t" stroke="#8b98ab" fontSize={11} tickLine={false} />
                <YAxis stroke="#8b98ab" fontSize={11} tickLine={false} width={60} />
                <Tooltip
                  contentStyle={{ background: "#111722", border: "1px solid #1c2534", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${Number(v).toFixed(2)} M`, "Value"]}
                />
                <Area type="monotone" dataKey="v" stroke="#2fd27d" fill="url(#pl)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card
          title="Agent status"
          subtitle="Dry-run mode active"
          action={<Badge tone={stats.agent_status === "idle" ? "neutral" : "accent"}>{stats.agent_status}</Badge>}
        >
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between"><span className="text-muted">Mode</span><span>Dry-run (read-only)</span></div>
            <div className="flex justify-between"><span className="text-muted">Manifold</span><Badge tone="profit">connected</Badge></div>
            <div className="flex justify-between"><span className="text-muted">Mistral AI</span><Badge tone="profit">connected</Badge></div>
            <div className="flex justify-between"><span className="text-muted">Supabase</span><Badge tone="profit">connected</Badge></div>
          </div>
        </Card>
      </div>

      <Card title="Recent trading activity" subtitle="Latest transactions (dry-run)">
        {recentTrades.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            No trades yet. The agent runs in dry-run mode — run a market scan to generate AI analyses.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="pb-2 pr-4 font-medium">Time</th>
                  <th className="pb-2 pr-4 font-medium">Market</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium">Outcome</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((t) => (
                  <tr key={t.id} className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-mono text-xs text-muted">
                      {new Date(t.created_at).toLocaleString()}
                    </td>
                    <td className="max-w-xs truncate py-2.5 pr-4">{t.market_question}</td>
                    <td className="py-2.5 pr-4"><Badge tone={t.type.includes("BUY") ? "profit" : "loss"}>{t.type}</Badge></td>
                    <td className="py-2.5 pr-4 font-mono text-xs">{t.outcome}</td>
                    <td className="py-2.5 text-right font-mono">{formatMana(t.amount_mana)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
