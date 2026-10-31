"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Spinner, ErrorBox, SetupNotice, formatMana } from "@/components/ui";
import type { Trade } from "@/lib/types";

interface HistoryResponse {
  trades: Trade[];
  services: { manifold: boolean; mistral: boolean; supabase: boolean };
  missing: string[];
}

export default function HistoryPage() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portfolio")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to load history");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Spinner label="Loading trading history…" />;
  if (data.missing.length > 0) return <SetupNotice missing={data.missing} />;

  const trades = data.trades;

  return (
    <Card title={`Trading history (${trades.length})`} subtitle="All recorded transactions (dry-run)">
      {trades.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No transactions recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="pb-2 pr-4 font-medium">Timestamp</th>
                <th className="pb-2 pr-4 font-medium">Market</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Outcome</th>
                <th className="pb-2 pr-4 font-medium text-right">Price</th>
                <th className="pb-2 pr-4 font-medium text-right">Amount</th>
                <th className="pb-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} className="border-b border-border/50">
                  <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-xs text-muted">
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                  <td className="max-w-xs truncate py-2.5 pr-4">{t.market_question}</td>
                  <td className="py-2.5 pr-4">
                    <Badge tone={t.type.includes("BUY") ? "profit" : "loss"}>{t.type}</Badge>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs">{t.outcome}</td>
                  <td className="py-2.5 pr-4 text-right font-mono">{(t.price * 100).toFixed(0)}¢</td>
                  <td className="py-2.5 pr-4 text-right font-mono">{formatMana(t.amount_mana)}</td>
                  <td className="py-2.5 text-xs text-muted">{t.result ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
