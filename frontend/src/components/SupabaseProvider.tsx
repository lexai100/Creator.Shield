"use client";

/**
 * Initialises Supabase anonymous session on first render.
 * Wrap this around the app in layout.tsx.
 */

import { useEffect } from "react";
import { ensureAnonSession } from "@/lib/supabase";

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ensureAnonSession().then(uid => {
      if (uid) console.debug("[CreatorShield] Session ready:", uid.slice(0, 8) + "…");
    });
  }, []);

  return <>{children}</>;
}
