"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Play } from "lucide-react";
import { Card, Badge, Spinner, ErrorBox, SetupNotice, formatMana, formatPct, formatDate } from "@/components/ui";
import type { ManifoldMarket } from "@/lib/types";

interface MarketsResponse {
  markets: ManifoldMarket[];
}

interface StatusResponse {
  services: { manifold: boolean; mistral: boolean; supabase: boolean };
  missing: string[];
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<ManifoldMarket[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then(setStatus).catch(() => {});
    fetch("/api/markets?limit=100")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to load markets");
        return r.json();
      })
      .then((d: MarketsResponse) => setMarkets(d.markets))
      .catch((e) => setError(e.message));
  }, []);

  const categories = useMemo(() => {
    const set = new Set(markets.map((m) => m.category).filter(Boolean) as string[]);
    return ["all", ...Array.from(set).slice(0, 12)];
  }, [markets]);

  const filtered = useMemo(() => {
    return markets.filter((m) => {
      if (category !== "all" && m.category !== category) return false;
      if (query && !m.question.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [markets, category, query]);

  const runScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const r = await fetch("/api/scan?limit=15", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Scan failed");
      setScanResult(`Scanned ${d.scanned} markets, found ${d.opportunities.length} AI-analyzed opportunities (dry-run).`);
    } catch (e) {
      setScanResult(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  if (error) return <ErrorBox message={error} />;
  if (!status) return <Spinner label="Loading markets…" />;
  if (status.missing.length > 0) return <SetupNotice missing={status.missing} />;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search markets…"
            className="w-full rounded-lg border border-border bg-panel py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted focus:border-accent"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-lg border px-3 py-1.5 text-xs capitalize transition-colors ${
                category === c
                  ? "border-accent/50 bg-accent/10 text-accent"
                  : "border-border bg-panel text-muted hover:text-text"
              }`}
            >
              {c}
            </button>
          ))}
          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Play size={13} />
            {scanning ? "Scanning…" : "Run AI scan (dry-run)"}
          </button>
        </div>
      </div>

      {scanResult && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-2.5 text-sm text-accent">{scanResult}</div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((m) => (
          <Card key={m.id} className="flex flex-col">
            <a
              href={m.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold leading-snug hover:text-accent"
            >
              {m.question}
            </a>
            <div className="mt-3 flex items-center gap-2">
              <Badge tone="profit">YES {formatPct(m.probability)}</Badge>
              <Badge tone="loss">NO {formatPct(1 - m.probability)}</Badge>
              {m.category && <Badge>{m.category}</Badge>}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <div><dt className="text-muted">Volume</dt><dd className="font-mono">{formatMana(m.volume)}</dd></div>
              <div><dt className="text-muted">Liquidity</dt><dd className="font-mono">{m.liquidity != null ? formatMana(m.liquidity) : "—"}</dd></div>
              <div><dt className="text-muted">Closes</dt><dd className="font-mono">{formatDate(m.closeTime)}</dd></div>
              <div><dt className="text-muted">Analysis</dt><dd><Badge tone="accent">scanned</Badge></dd></div>
            </dl>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && markets.length > 0 && (
        <p className="py-10 text-center text-sm text-muted">No markets match your filters.</p>
      )}
    </div>
  );
}
