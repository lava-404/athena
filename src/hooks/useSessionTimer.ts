"use client";

import { useEffect, useRef } from "react";
import { useSessionStore } from "@/lib/store/sessionStore";

const TICK_MS = 1000;

/** Drives the two clocks the store cares about: locked-in session time
 * (feeds fatigue) and break countdown. Kept as one small interval rather
 * than scattering timers across components. */
export function useSessionTimer() {
  const lockState = useSessionStore((s) => s.lockState);
  const tickSession = useSessionStore((s) => s.tickSession);
  const tickBreak = useSessionStore((s) => s.tickBreak);
  const endBreak = useSessionStore((s) => s.endBreak);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    lastTickRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      if (lockState === "locked") {
        tickSession(delta);
      } else if (lockState === "on-break") {
        tickBreak(delta);
        if (useSessionStore.getState().breakSecondsRemaining <= 0) {
          endBreak();
        }
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [lockState, tickSession, tickBreak, endBreak]);
}
