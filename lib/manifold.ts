import "server-only";
import { env } from "./env";
import { fetchWithRetry, ApiError } from "./http";
import type { ManifoldMarket } from "./types";

const API_BASE = "https://api.manifold.markets/v0";

function headers(): HeadersInit {
  const key = env.manifoldApiKey;
  if (!key) throw new ApiError("MANIFOLD_API_KEY is not configured", 503);
  return { Authorization: `Key ${key}`, "Content-Type": "application/json" };
}

interface RawMarket {
  id: string;
  question: string;
  description?: string;
  url: string;
  probability?: number;
  volume?: number;
  volume24h?: number;
  liquidity?: number;
  closeTime?: number;
  creatorName?: string;
  groupSlugs?: string[];
  isResolved?: boolean;
  resolution?: string;
}

function toMarket(raw: RawMarket): ManifoldMarket {
  return {
    id: raw.id,
    question: raw.question,
    description: raw.description,
    url: raw.url,
    probability: raw.probability ?? 0.5,
    volume: raw.volume ?? 0,
    volume24h: raw.volume24h,
    liquidity: raw.liquidity,
    closeTime: raw.closeTime,
    creatorName: raw.creatorName,
    category: raw.groupSlugs?.[0],
    isResolved: raw.isResolved ?? false,
    resolution: raw.resolution,
  };
}

export async function listMarkets(limit = 100): Promise<ManifoldMarket[]> {
  const url = `${API_BASE}/markets?limit=${limit}&sort=liquidity`;
  const res = await fetchWithRetry(url, { headers: headers() });
  if (!res.ok) throw new ApiError(`Manifold listMarkets failed: ${res.status}`, res.status);
  const data = (await res.json()) as RawMarket[];
  return data.filter((m) => !m.isResolved).map(toMarket);
}

export async function getMarket(slugOrId: string): Promise<ManifoldMarket> {
  const res = await fetchWithRetry(`${API_BASE}/market/${encodeURIComponent(slugOrId)}`, {
    headers: headers(),
  });
  if (!res.ok) throw new ApiError(`Manifold getMarket failed: ${res.status}`, res.status);
  return toMarket((await res.json()) as RawMarket);
}

export async function getBalance(): Promise<{ balance: number; currency: string }> {
  const res = await fetchWithRetry(`${API_BASE}/me`, { headers: headers() });
  if (!res.ok) throw new ApiError(`Manifold balance failed: ${res.status}`, res.status);
  const me = (await res.json()) as { balance?: number };
  return { balance: me.balance ?? 0, currency: "mana" };
}

export async function getPositions(): Promise<unknown> {
  const res = await fetchWithRetry(`${API_BASE}/bets?limit=100`, { headers: headers() });
  if (!res.ok) throw new ApiError(`Manifold positions failed: ${res.status}`, res.status);
  return res.json();
}

export async function searchMarkets(query: string, limit = 50): Promise<ManifoldMarket[]> {
  const url = `${API_BASE}/markets?limit=${limit}&term=${encodeURIComponent(query)}`;
  const res = await fetchWithRetry(url, { headers: headers() });
  if (!res.ok) throw new ApiError(`Manifold search failed: ${res.status}`, res.status);
  const data = (await res.json()) as RawMarket[];
  return data.filter((m) => !m.isResolved).map(toMarket);
}
