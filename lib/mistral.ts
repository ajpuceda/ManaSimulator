import "server-only";
import { z } from "zod";
import { env } from "./env";
import { fetchWithRetry, ApiError } from "./http";

const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";

export function mistralModel(): string {
  return process.env.MISTRAL_MODEL?.trim() || "mistral-small-latest";
}

export const MistralAnalysisSchema = z.object({
  estimated_probability_yes: z.number().min(0).max(1),
  estimated_probability_no: z.number().min(0).max(1),
  market_probability: z.number().min(0).max(1),
  estimated_edge: z.number().min(-1).max(1),
  confidence_score: z.number().min(0).max(100),
  recommended_action: z.enum(["YES", "NO", "HOLD"]),
  reasoning: z.string().min(1),
  supporting_evidence: z.array(z.string()).default([]),
  risk_factors: z.array(z.string()).default([]),
  analysis_timestamp: z.string().default(() => new Date().toISOString()),
});

export type MistralAnalysis = z.infer<typeof MistralAnalysisSchema>;

export interface AnalysisInput {
  question: string;
  description?: string;
  marketProbability: number;
  liquidity?: number;
  volume?: number;
  closeTime?: number;
  probabilityHistory?: number[];
  facts?: string;
}

export async function analyzeMarket(input: AnalysisInput): Promise<MistralAnalysis> {
  const key = env.mistralApiKey;
  if (!key) throw new ApiError("MISTRAL_API_KEY is not configured", 503);

  const system = [
    "You are a quantitative analyst for prediction markets on Manifold Markets.",
    "Estimate the TRUE probability that the market resolves YES, using only the provided data.",
    "Confidence is your subjective certainty (0-100), NOT a calibrated probability.",
    "If evidence is insufficient or ambiguous, you MUST recommend HOLD.",
    "Respond ONLY with JSON matching this exact schema:",
    '{ "estimated_probability_yes": number 0-1, "estimated_probability_no": number 0-1,',
    '  "market_probability": number 0-1, "estimated_edge": number -1..1,',
    '  "confidence_score": number 0-100, "recommended_action": "YES"|"NO"|"HOLD",',
    '  "reasoning": string, "supporting_evidence": string[], "risk_factors": string[],',
    '  "analysis_timestamp": ISO string }',
  ].join(" ");

  const close = input.closeTime
    ? new Date(input.closeTime).toISOString()
    : "unknown";
  const history = input.probabilityHistory?.length
    ? input.probabilityHistory.map((p) => p.toFixed(3)).join(", ")
    : "not available";
  const user = [
    `Market question: ${input.question}`,
    `Description: ${input.description ?? "n/a"}`,
    `Current YES probability: ${input.marketProbability.toFixed(4)} (NO: ${(1 - input.marketProbability).toFixed(4)})`,
    `Liquidity: ${input.liquidity ?? "unknown"} Mana`,
    `Total volume: ${input.volume ?? "unknown"} Mana`,
    `Closing date: ${close}`,
    `Recent probability path (oldest→newest): ${history}`,
    input.facts ? `Relevant facts/news: ${input.facts}` : "No additional news provided.",
  ].join("\n");

  const res = await fetchWithRetry(
    MISTRAL_URL,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: mistralModel(),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    },
    { retries: 3, backoffMs: 1000, timeoutMs: 60000 },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(`Mistral analysis failed: HTTP ${res.status} ${body.slice(0, 200)}`, res.status === 429 ? 429 : 502);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new ApiError("Mistral returned an empty response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new ApiError("Mistral returned malformed JSON");
  }
  const result = MistralAnalysisSchema.safeParse(parsed);
  if (!result.success) {
    throw new ApiError(`Mistral response failed validation: ${result.error.issues.map((i) => i.message).join("; ")}`);
  }
  const a = result.data;
  if (Math.abs(a.estimated_probability_yes + a.estimated_probability_no - 1) > 0.02) {
    throw new ApiError("Mistral probabilities do not sum to 1");
  }
  if (Math.abs(a.estimated_edge - (a.estimated_probability_yes - a.market_probability)) > 0.02) {
    a.estimated_edge = a.estimated_probability_yes - a.market_probability;
  }
  return a;
}
