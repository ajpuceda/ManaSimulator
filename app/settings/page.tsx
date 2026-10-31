"use client";

import { useEffect, useState } from "react";
import { Card, Spinner, ErrorBox, SetupNotice, Badge } from "@/components/ui";
import type { BotSettings } from "@/lib/types";

interface SettingsResponse {
  settings: BotSettings;
  services: { manifold: boolean; mistral: boolean; supabase: boolean };
  missing: string[];
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [form, setForm] = useState<Partial<BotSettings>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to load settings");
        return r.json();
      })
      .then((d: SettingsResponse) => {
        setData(d);
        setForm(d.settings);
      })
      .catch((e) => setError(e.message));
  }, []);

  const save = async () => {
    setSaved(false);
    const r = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      const d = await r.json();
      setData(d);
      setSaved(true);
    }
  };

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Spinner label="Loading settings…" />;

  const num = (key: keyof BotSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: Number(e.target.value) }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 md:gap-6">
      <Card title="API credentials" subtitle="Stored only as server-side environment variables — never shipped to the browser">
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between rounded-lg border border-border bg-panel-2 px-3 py-2.5">
            <div><p className="font-medium">Manifold API key</p><p className="font-mono text-xs text-muted">MANIFOLD_API_KEY</p></div>
            <Badge tone={data.services.manifold ? "profit" : "loss"}>{data.services.manifold ? "configured" : "missing"}</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-panel-2 px-3 py-2.5">
            <div><p className="font-medium">Mistral API key</p><p className="font-mono text-xs text-muted">MISTRAL_API_KEY</p></div>
            <Badge tone={data.services.mistral ? "profit" : "loss"}>{data.services.mistral ? "configured" : "missing"}</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-panel-2 px-3 py-2.5">
            <div><p className="font-medium">Supabase</p><p className="font-mono text-xs text-muted">SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY</p></div>
            <Badge tone={data.services.supabase ? "profit" : "loss"}>{data.services.supabase ? "configured" : "missing"}</Badge>
          </div>
        </div>
        {data.missing.length > 0 && <div className="mt-3"><SetupNotice missing={data.missing} /></div>}
      </Card>

      <Card title="Trading parameters" subtitle="Dry-run enforced — no real Mana will be spent">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Max position size (Mana)</span>
            <input type="number" value={form.max_position_size} onChange={num("max_position_size")} className="rounded-lg border border-border bg-panel-2 px-3 py-2 outline-none focus:border-accent" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Max daily allocation (%)</span>
            <input type="number" value={form.max_daily_allocation_pct} onChange={num("max_daily_allocation_pct")} className="rounded-lg border border-border bg-panel-2 px-3 py-2 outline-none focus:border-accent" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Min AI edge (pp)</span>
            <input type="number" value={form.min_edge_pct} onChange={num("min_edge_pct")} className="rounded-lg border border-border bg-panel-2 px-3 py-2 outline-none focus:border-accent" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Max open positions</span>
            <input type="number" value={form.max_open_positions} onChange={num("max_open_positions")} className="rounded-lg border border-border bg-panel-2 px-3 py-2 outline-none focus:border-accent" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Scan interval (minutes)</span>
            <input type="number" value={form.scan_interval_minutes} onChange={num("scan_interval_minutes")} className="rounded-lg border border-border bg-panel-2 px-3 py-2 outline-none focus:border-accent" />
          </label>
          <label className="flex items-center justify-between gap-2 rounded-lg border border-border bg-panel-2 px-3 py-2.5 text-sm sm:col-span-2">
            <span>Automation enabled</span>
            <input
              type="checkbox"
              checked={Boolean(form.automation_enabled)}
              onChange={(e) => setForm((f) => ({ ...f, automation_enabled: e.target.checked }))}
              className="h-4 w-4 accent-blue-500"
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={save}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Save settings
          </button>
          {saved && <span className="text-sm text-profit">Saved.</span>}
          <span className="text-xs text-muted">Mode: dry-run (read-only) — enforced server-side</span>
        </div>
      </Card>
    </div>
  );
}
