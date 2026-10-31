"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Spinner, ErrorBox, SetupNotice, PlValue, formatPct } from "@/components/ui";
import type { Position } from "@/lib/types";

interface PortfolioResponse {
  positions: Position[];
  services: { manifold: boolean; mistral: boolean; supabase: boolean };
  missing: string[];
}

export default function PortfolioPage() {
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portfolio")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to load portfolio");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Spinner label="Loading portfolio…" />;
  if (data.missing.length > 0) return <SetupNotice missing={data.missing} />;

  const open = data.positions.filter((p) => p.status === "open");
  const closed = data.positions.filter((p) => p.status === "closed");

  const renderTable = (rows: Position[]) =>
    rows.length === 0 ? (
      <p className="py-6 text-center text-sm text-muted">No positions.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="pb-2 pr-4 font-medium">Market</th>
              <th className="pb-2 pr-4 font-medium">Direction</th>
              <th className="pb-2 pr-4 font-medium text-right">Entry</th>
              <th className="pb-2 pr-4 font-medium text-right">Current</th>
              <th className="pb-2 pr-4 font-medium text-right">Invested</th>
              <th className="pb-2 pr-4 font-medium text-right">Unrealized P/L</th>
              <th className="pb-2 font-medium text-right">Realized P/L</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-border/50">
                <td className="max-w-xs truncate py-2.5 pr-4">{p.market_question}</td>
                <td className="py-2.5 pr-4">
                  <Badge tone={p.outcome === "YES" ? "profit" : "loss"}>{p.outcome}</Badge>
                </td>
                <td className="py-2.5 pr-4 text-right font-mono">{formatPct(p.entry_price)}</td>
                <td className="py-2.5 pr-4 text-right font-mono">{formatPct(p.current_price)}</td>
                <td className="py-2.5 pr-4 text-right font-mono">{p.mana_invested.toFixed(1)} M</td>
                <td className="py-2.5 pr-4 text-right"><PlValue value={p.unrealized_pl} /></td>
                <td className="py-2.5 text-right"><PlValue value={p.realized_pl} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Card title={`Open positions (${open.length})`} subtitle="Dry-run portfolio">
        {renderTable(open)}
      </Card>
      <Card title={`Closed positions (${closed.length})`}>{renderTable(closed)}</Card>
    </div>
  );
}
