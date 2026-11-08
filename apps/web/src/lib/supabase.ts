import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase is optional. RiskSense must run self-hosted with no proprietary
 * dependency, so every call site degrades gracefully when credentials are
 * absent — community reports then fall back to an in-memory store.
 */
let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    cached = null;
    return cached;
  }

  cached = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { "x-application-name": "risksense" } },
  });
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
