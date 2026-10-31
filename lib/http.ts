import "server-only";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 502,
  ) {
    super(message);
  }
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { retries?: number; backoffMs?: number; timeoutMs?: number } = {},
): Promise<Response> {
  const { retries = 2, backoffMs = 800, timeoutMs = 20000 } = opts;
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        lastError = new ApiError(`Upstream returned ${res.status}`, res.status);
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
          continue;
        }
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
        continue;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new ApiError("Request failed");
}
