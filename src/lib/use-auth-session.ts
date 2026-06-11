"use client";

import { useEffect, useState } from "react";
import { getSession, type AuthSession } from "@/lib/auth";

/**
 * Reads auth session from localStorage after mount so SSR and the first client
 * paint render the same markup (avoids hydration mismatches).
 */
export function useAuthSession(): AuthSession | null {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    setSession(getSession());
  }, []);

  return session;
}

/** True after the component has mounted (client-only). */
export function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
