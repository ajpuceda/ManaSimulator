import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const env = {
  get manifoldApiKey() {
    return optional("MANIFOLD_API_KEY");
  },
  get mistralApiKey() {
    return optional("MISTRAL_API_KEY");
  },
  get supabaseUrl() {
    return optional("SUPABASE_URL");
  },
  get supabaseServiceRoleKey() {
    return optional("SUPABASE_SERVICE_ROLE_KEY");
  },
  get cronSecret() {
    return optional("CRON_SECRET");
  },
};

export function serviceStatus() {
  return {
    manifold: Boolean(env.manifoldApiKey),
    mistral: Boolean(env.mistralApiKey),
    supabase: Boolean(env.supabaseUrl && env.supabaseServiceRoleKey),
  };
}

export function missingServices(): string[] {
  const missing: string[] = [];
  if (!env.manifoldApiKey) missing.push("MANIFOLD_API_KEY");
  if (!env.mistralApiKey) missing.push("MISTRAL_API_KEY");
  if (!env.supabaseUrl) missing.push("SUPABASE_URL");
  if (!env.supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}

export function requireEnv(name: "manifold" | "mistral" | "supabase"): void {
  const status = serviceStatus();
  if (!status[name]) {
    throw new Error(
      `Service "${name}" is not configured. Set the corresponding environment variables.`,
    );
  }
}

export { required };
