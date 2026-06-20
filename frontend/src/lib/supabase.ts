/**
 * Supabase client — singleton with anonymous auth.
 * On first visit, Supabase signs the user in anonymously and stores
 * the session in localStorage. Same device = same user ID forever.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// During Next.js static prerender, env vars may be absent — use a placeholder
// so the module can be imported without throwing. Real calls are guarded by
// `isConfigured` below.
const PLACEHOLDER = "https://placeholder.supabase.co";

export const supabase = createClient(
  supabaseUrl || PLACEHOLDER,
  supabaseKey || "placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

/** True when Supabase credentials are actually present at runtime */
export const isConfigured = Boolean(supabaseUrl && supabaseKey);

/**
 * Ensure the user has an anonymous session.
 * Call this once on app load (in layout or a provider).
 * Returns the user's UUID — consistent per device.
 */
export async function ensureAnonSession(): Promise<string | null> {
  if (typeof window === "undefined" || !isConfigured) return null;

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error("Supabase anon sign-in failed:", error.message);
    return null;
  }
  return data.user?.id ?? null;
}

export async function getCurrentUserId(): Promise<string | null> {
  if (typeof window === "undefined" || !isConfigured) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
