"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Spinner, ErrorBox, SetupNotice } from "@/components/ui";
import type { DecisionLog } from "@/lib/types";

interface DecisionsResponse {
  decisions: DecisionLog[];
}

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<DecisionLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/decisions")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to load decisions");
        return r.json();
      })
      .then((d: DecisionsResponse) => setDecisions(d.decisions))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (loading) return <Spinner label="Loading AI decisions…" />;

  return (
    <Card title={`AI decision log (${decisions.length})`} subtitle="Full transparency: every trade considered, made, or rejected">
      {decisions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No decisions recorded yet. Enable automation and run a scan cycle.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {decisions.map((d) => (
            <div key={d.id} className="rounded-lg border border-border bg-panel-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{d.market_question}</span>
                <Badge tone="accent">{d.mode}</Badge>
                <Badge tone={d.decision === "EXECUTE" ? "profit" : "neutral"}>{d.decision}</Badge>
              </div>
              <ul className="mt-2 flex flex-col gap-1 text-xs text-muted">
                {d.reasons.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
              {d.execution_result && (
                <p className="mt-2 font-mono text-xs text-muted">{d.execution_result}</p>
              )}
              <p className="mt-2 font-mono text-[11px] text-muted">{new Date(d.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
