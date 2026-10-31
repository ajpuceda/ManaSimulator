import "server-only";
import { env } from "./env";
import { fetchWithRetry, ApiError } from "./http";

const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
const MODEL = "mistral-large-latest";

export interface MistralAnalysis {
  ai_probability: number;
  confidence: number;
  expected_value: number;
  risk_factors: string[];
  evidence: string[];
  recommendation: "BUY_YES" | "BUY_NO" | "HOLD" | "SKIP";
  reasoning: string;
}

export async function analyzeMarket(params: {
  question: string;
  description?: string;
  marketProbability: number;
}): Promise<MistralAnalysis> {
  const key = env.mistralApiKey;
  if (!key) throw new ApiError("MISTRAL_API_KEY is not configured", 503);

  const system =
    "You are a quantitative analyst for prediction markets. Estimate the true probability " +
    "of the event resolving YES. Respond ONLY with strict JSON matching this schema: " +
    '{ "ai_probability": number 0-1, "confidence": number 0-1, "expected_value": number, ' +
    '"risk_factors": string[], "evidence": string[], "recommendation": "BUY_YES"|"BUY_NO"|"HOLD"|"SKIP", "reasoning": string }';

  const user = `Market question: ${params.question}\nDescription: ${params.description ?? "n/a"}\nCurrent market probability of YES: ${params.marketProbability}`;

  const res = await fetchWithRetry(
    MISTRAL_URL,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    },
    { retries: 2, timeoutMs: 45000 },
  );
  if (!res.ok) throw new ApiError(`Mistral analysis failed: ${res.status}`, res.status);
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new ApiError("Mistral returned an empty response");
  try {
    const parsed = JSON.parse(content) as MistralAnalysis;
    parsed.ai_probability = Math.min(1, Math.max(0, parsed.ai_probability));
    parsed.confidence = Math.min(1, Math.max(0, parsed.confidence));
    return parsed;
  } catch {
    throw new ApiError("Mistral returned malformed JSON");
  }
}
