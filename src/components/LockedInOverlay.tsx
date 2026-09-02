"use client";

import { motion } from "framer-motion";
import { Buddy } from "./Buddy/Buddy";
import { useSessionStore } from "@/lib/store/sessionStore";

// The "locking in" ritual exists to make the start of a session feel like a
// small, deliberate moment rather than a setting flipping on — it's the
// difference between a companion sitting down with you and a monitor
// switching on behind you.
export function LockInRitual() {
  const speech = useSessionStore((s) => s.speech);
  const completeLockIn = useSessionStore((s) => s.completeLockIn);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-ink/95 backdrop-blur-sm"
    >
      <Buddy state="greeting" size={220} />
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="max-w-sm text-center font-display text-xl font-medium text-paper"
      >
        {speech}
      </motion.p>
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        onClick={completeLockIn}
        className="rounded-full bg-amber px-6 py-3 font-medium text-white shadow-buddy transition hover:bg-amber-deep"
      >
        I&apos;m ready
      </motion.button>
    </motion.div>
  );
}

export function BreakOverlay() {
  const breakSecondsRemaining = useSessionStore((s) => s.breakSecondsRemaining);
  const reLock = useSessionStore((s) => s.reLock);
  const endBreak = useSessionStore((s) => s.endBreak);

  const minutes = Math.floor(breakSecondsRemaining / 60);
  const seconds = Math.floor(breakSecondsRemaining % 60)
    .toString()
    .padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-sage-deep/95 backdrop-blur-sm"
    >
      <Buddy state="celebrating" size={200} />
      <div className="text-center text-paper">
        <p className="font-display text-2xl font-semibold">Enjoy your break</p>
        <p className="mt-1 text-paper/80">
          {breakSecondsRemaining > 0 ? `${minutes}:${seconds} remaining` : "Whenever you're ready"}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reLock}
          className="rounded-full bg-white px-6 py-3 font-medium text-sage-deep shadow-soft transition hover:bg-paper"
        >
          Lock back in with Buddy
        </button>
        <button
          onClick={endBreak}
          className="rounded-full bg-white/10 px-6 py-3 font-medium text-paper transition hover:bg-white/20"
        >
          Just leave the room open
        </button>
      </div>
    </motion.div>
  );
}
