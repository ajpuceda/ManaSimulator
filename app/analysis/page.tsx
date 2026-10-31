"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, Badge, Spinner, ErrorBox, SetupNotice, formatPct } from "@/components/ui";
import type { AiAnalysis, ManifoldMarket } from "@/lib/types";

interface StatusResponse {
  services: { manifold: boolean; mistral: boolean; supabase: boolean };
  missing: string[];
}

const REC_TONE: Record<string, "profit" | "loss" | "neutral" | "accent"> = {
  BUY_YES: "profit",
  BUY_NO: "loss",
  HOLD: "neutral",
  SKIP: "accent",
};

function AnalysisContent() {
  const searchParams = useSearchParams();
  const marketId = searchParams.get("market");
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [market, setMarket] = useState<ManifoldMarket | null>(null);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then(setStatus).catch(() => {});
  }, []);

  useEffect(() => {
    if (!marketId || !status || status.missing.length > 0) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/markets/${encodeURIComponent(marketId)}`).then((r) => r.json()),
      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketId }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Analysis failed");
        return r.json();
      }),
    ])
      .then(([m, a]) => {
        setMarket(m.market);
        setAnalysis(a.analysis);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [marketId, status]);

  if (!status) return <Spinner label="Loading…" />;
  if (status.missing.length > 0) return <SetupNotice missing={status.missing} />;
  if (!marketId) {
    return (
      <Card title="AI Analysis">
        <p className="py-8 text-center text-sm text-muted">
          Select a market from the{" "}
          <a href="/markets" className="text-accent hover:underline">Market Scanner</a> to run a Mistral-powered analysis.
        </p>
      </Card>
    );
  }
  if (error) return <ErrorBox message={error} />;
  if (loading || !market || !analysis) return <Spinner label="Mistral is analyzing the market…" />;

  const diff = analysis.edge;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Card title={market.question} subtitle={market.url}>
        <div className="flex flex-wrap gap-2">
          <Badge tone={REC_TONE[analysis.recommendation]}>{analysis.recommendation}</Badge>
          <Badge tone={diff >= 0 ? "profit" : "loss"}>Edge {diff >= 0 ? "+" : ""}{diff.toFixed(1)}pp</Badge>
          <Badge tone="accent">Confidence {formatPct(analysis.confidence)}</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <Card title="Market probability"><p className="font-mono text-2xl">{formatPct(analysis.market_probability)}</p></Card>
        <Card title="Mistral estimated"><p className="font-mono text-2xl text-accent">{formatPct(analysis.ai_probability)}</p></Card>
        <Card title="Difference"><p className={`font-mono text-2xl ${diff >= 0 ? "text-profit" : "text-loss"}`}>{diff >= 0 ? "+" : ""}{diff.toFixed(1)}pp</p></Card>
        <Card title="AI confidence"><p className="font-mono text-2xl">{formatPct(analysis.confidence)}</p></Card>
        <Card title="Expected value"><p className={`font-mono text-2xl ${analysis.expected_value >= 0 ? "text-profit" : "text-loss"}`}>{analysis.expected_value.toFixed(3)}</p></Card>
        <Card title="Recommended action"><p className="text-xl font-semibold">{analysis.recommendation}</p></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <Card title="Supporting evidence">
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted">
            {analysis.evidence.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </Card>
        <Card title="Risk factors">
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted">
            {analysis.risk_factors.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </Card>
      </div>

      <Card title="Reasoning">
        <p className="max-w-3xl text-sm leading-relaxed text-muted">{analysis.reasoning}</p>
      </Card>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<Spinner label="Loading…" />}>
      <AnalysisContent />
    </Suspense>
  );
}
