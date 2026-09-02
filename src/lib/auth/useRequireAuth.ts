"use client";

import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

/** Redirects to the landing page (where login lives) if the user isn't
 * authenticated. Waits for Privy's `ready` flag first so we don't bounce
 * someone who's actually logged in but whose session just hasn't loaded yet. */
export function useRequireAuth() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace("/");
    }
  }, [ready, authenticated, router]);

  return { ready, authenticated };
}
