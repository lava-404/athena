"use client";

import { motion } from "framer-motion";
import { useSessionStore } from "@/lib/store/sessionStore";
import { Buddy } from "./Buddy";
import { SpeechBubble } from "./SpeechBubble";
import { BUDDY_LABEL } from "./BuddyStates";
import type { NudgeCategory } from "@/types";

const NUDGE_CATEGORY_LABEL: Record<NudgeCategory, string> = {
  posture: "Posture check",
  away: "Away from camera",
  distracted: "Looking away",
  break: "Break time",
  "break-insistent": "Really, take a break",
};

export function BuddyPanel() {
  const buddy = useSessionStore((s) => s.buddy);
  const speech = useSessionStore((s) => s.speech);
  const nudgeCategory = useSessionStore((s) => s.nudgeCategory);
  const acknowledgeNudge = useSessionStore((s) => s.acknowledgeNudge);
  const lockState = useSessionStore((s) => s.lockState);

  const showNudgeActions = buddy === "nudge" || buddy === "nudge-insistent";
  const label = nudgeCategory ? NUDGE_CATEGORY_LABEL[nudgeCategory] : BUDDY_LABEL[buddy];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 rounded-3xl bg-gradient-to-b from-sage-soft/60 to-transparent p-6">
      <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium tracking-wide text-ink-soft">
        {label}
      </span>

      <Buddy state={buddy} size={168} />

      <div className="flex min-h-[76px] flex-col items-center gap-3">
        <SpeechBubble text={speech} />

        {showNudgeActions && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2"
          >
            <button
              onClick={() => acknowledgeNudge(true)}
              className="rounded-full bg-sage px-4 py-2 text-sm font-medium text-white shadow-soft transition hover:bg-sage-deep"
            >
              {buddy === "nudge-insistent" ? "Take a break" : "Take a break"}
            </button>
            <button
              onClick={() => acknowledgeNudge(false)}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-ink-soft shadow-soft transition hover:bg-paper"
            >
              Not yet
            </button>
          </motion.div>
        )}
      </div>

      {lockState === "locked" && <SessionStrip />}
    </div>
  );
}

function SessionStrip() {
  const postureScore = useSessionStore((s) => s.postureScore);
  const focusScore = useSessionStore((s) => s.focusScore);
  const sessionSeconds = useSessionStore((s) => s.sessionSeconds);

  const minutes = Math.floor(sessionSeconds / 60);
  const seconds = Math.floor(sessionSeconds % 60)
    .toString()
    .padStart(2, "0");

  return (
    <div className="mt-2 grid w-full max-w-[220px] grid-cols-2 gap-2 text-center text-xs text-ink-soft">
      <Stat label="Posture" value={Math.round(postureScore)} />
      <Stat label="Focus" value={Math.round(focusScore)} />
      <div className="col-span-2 rounded-xl bg-white/60 py-1.5">
        Locked in · {minutes}:{seconds}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const tone =
    value >= 70 ? "text-sage-deep" : value >= 45 ? "text-amber-deep" : "text-coral";
  return (
    <div className="rounded-xl bg-white/60 py-1.5">
      <div className={`font-semibold ${tone}`}>{value}</div>
      <div>{label}</div>
    </div>
  );
}
