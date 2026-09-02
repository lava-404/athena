"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import type { BuddyState } from "@/types";
import { BUDDY_VISUALS } from "./BuddyStates";

interface BuddyProps {
  state: BuddyState;
  size?: number;
}

const BOUNCE_ANIMATION: Record<string, { y: number[]; duration: number }> = {
  none: { y: [0, 0], duration: 6 },
  gentle: { y: [0, -6, 0], duration: 4.5 },
  slow: { y: [0, -3, 0], duration: 5.5 },
  bright: { y: [0, -14, 0], duration: 1.1 },
};

/** Renders one eye. Shape communicates mood at a glance: round (neutral),
 * wide (alert/observing), squint (pleased), droopy (concerned/tired), and a
 * closed happy arc for celebration — deliberately never a "sad" downturned
 * eye, since the Buddy should never look disappointed in the user. */
function Eye({ cx, kind }: { cx: number; kind: string }) {
  const cy = 92;
  switch (kind) {
    case "closed-happy":
      return (
        <path
          d={`M ${cx - 9} ${cy} Q ${cx} ${cy - 10} ${cx + 9} ${cy}`}
          stroke="#182620"
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
      );
    case "droopy":
      return (
        <motion.ellipse
          cx={cx}
          cy={cy + 3}
          rx={8}
          ry={5.5}
          fill="#182620"
          className="origin-center animate-blink"
        />
      );
    case "squint":
      return (
        <motion.ellipse
          cx={cx}
          cy={cy}
          rx={8}
          ry={4}
          fill="#182620"
          className="origin-center animate-blink"
        />
      );
    case "wide":
      return (
        <motion.circle
          cx={cx}
          cy={cy}
          r={9.5}
          fill="#182620"
          className="origin-center animate-blink"
        />
      );
    default:
      return (
        <motion.circle
          cx={cx}
          cy={cy}
          r={8}
          fill="#182620"
          className="origin-center animate-blink"
        />
      );
  }
}

export function Buddy({ state, size = 176 }: BuddyProps) {
  const visual = BUDDY_VISUALS[state];
  const bounce = BOUNCE_ANIMATION[visual.bounce];

  const bodyPath = useMemo(
    () =>
      "M 100 32 C 140 32 168 62 168 104 C 168 146 138 176 100 176 C 62 176 32 146 32 104 C 32 62 60 32 100 32 Z",
    []
  );

  return (
    <motion.div
      animate={{ rotate: visual.bodyTilt, y: bounce.y }}
      transition={{
        rotate: { type: "spring", stiffness: 120, damping: 14 },
        y: { duration: bounce.duration, repeat: Infinity, ease: "easeInOut" },
      }}
      style={{ width: size, height: size }}
      className="relative"
    >
      <svg viewBox="0 0 200 200" width={size} height={size} className="drop-shadow-buddy">
        <defs>
          <radialGradient id="buddyBody" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#FBDDB6" />
            <stop offset="55%" stopColor={visual.bodyColor} />
            <stop offset="100%" stopColor="#C97F2F" />
          </radialGradient>
        </defs>

        <motion.path
          d={bodyPath}
          fill="url(#buddyBody)"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "100px 110px" }}
        />

        {/* cheeks */}
        {visual.cheeks && (
          <>
            <ellipse cx={68} cy={110} rx={9} ry={6} fill="#F0665A" opacity={0.35} />
            <ellipse cx={132} cy={110} rx={9} ry={6} fill="#F0665A" opacity={0.35} />
          </>
        )}

        <Eye cx={78} kind={visual.eye.kind} />
        <Eye cx={122} kind={visual.eye.kind} />

        <path
          d={visual.mouthPath}
          transform="translate(100 130)"
          stroke="#182620"
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />

        {/* small nub arms — only really "seen" during celebration, when they
            lift, but present at rest so the character reads as embodied */}
        <motion.ellipse
          cx={40}
          cy={130}
          rx={10}
          ry={7}
          fill={visual.bodyColor}
          animate={
            state === "celebrating"
              ? { rotate: [-10, 20, -10], y: [0, -10, 0] }
              : { rotate: 0 }
          }
          transition={{ duration: 0.9, repeat: state === "celebrating" ? Infinity : 0 }}
          style={{ transformOrigin: "40px 130px" }}
        />
        <motion.ellipse
          cx={160}
          cy={130}
          rx={10}
          ry={7}
          fill={visual.bodyColor}
          animate={
            state === "celebrating"
              ? { rotate: [10, -20, 10], y: [0, -10, 0] }
              : { rotate: 0 }
          }
          transition={{ duration: 0.9, repeat: state === "celebrating" ? Infinity : 0 }}
          style={{ transformOrigin: "160px 130px" }}
        />
      </svg>

      {state === "celebrating" && <Sparkles />}
    </motion.div>
  );
}

function Sparkles() {
  const positions = [
    { x: "10%", y: "10%", delay: 0 },
    { x: "85%", y: "20%", delay: 0.2 },
    { x: "80%", y: "75%", delay: 0.35 },
    { x: "5%", y: "70%", delay: 0.5 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0">
      {positions.map((p, i) => (
        <motion.span
          key={i}
          className="absolute text-xl"
          style={{ left: p.x, top: p.y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0.8], rotate: [0, 30] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: p.delay }}
        >
          ✨
        </motion.span>
      ))}
    </div>
  );
}
