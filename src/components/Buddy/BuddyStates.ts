import type { BuddyState } from "@/types";

export interface EyeShape {
  /** Eye height scale — 1 = normal round eye, <1 = squint/happy, "closed" for a soft arc. */
  kind: "round" | "squint" | "wide" | "closed-happy" | "droopy";
}

export interface BuddyVisual {
  mouthPath: string; // path data for a 40x24 mouth viewport centered at origin
  eye: EyeShape;
  bodyColor: string;
  cheeks: boolean;
  bodyTilt: number; // degrees, whole-body tilt for personality
  bounce: "none" | "gentle" | "bright" | "slow";
}

// Every state's look is intentionally distinct so the user can read the
// Buddy's mood at a glance without needing to read the speech bubble first —
// the animation should communicate before the words do.
export const BUDDY_VISUALS: Record<BuddyState, BuddyVisual> = {
  greeting: {
    mouthPath: "M -14 -2 Q 0 12 14 -2",
    eye: { kind: "round" },
    bodyColor: "#F2A65A",
    cheeks: true,
    bodyTilt: 0,
    bounce: "gentle",
  },
  idle: {
    mouthPath: "M -10 2 Q 0 6 10 2",
    eye: { kind: "round" },
    bodyColor: "#F2A65A",
    cheeks: false,
    bodyTilt: 0,
    bounce: "gentle",
  },
  observing: {
    mouthPath: "M -8 3 Q 0 1 8 3",
    eye: { kind: "wide" },
    bodyColor: "#EFA24F",
    cheeks: false,
    bodyTilt: 6,
    bounce: "slow",
  },
  nudge: {
    mouthPath: "M -9 4 Q 0 -1 9 4",
    eye: { kind: "droopy" },
    bodyColor: "#EDA85F",
    cheeks: false,
    bodyTilt: -4,
    bounce: "slow",
  },
  "nudge-insistent": {
    mouthPath: "M -10 5 Q 0 -3 10 5",
    eye: { kind: "droopy" },
    bodyColor: "#E9A15A",
    cheeks: false,
    bodyTilt: -8,
    bounce: "slow",
  },
  encouraged: {
    mouthPath: "M -14 -3 Q 0 14 14 -3",
    eye: { kind: "squint" },
    bodyColor: "#F2B26B",
    cheeks: true,
    bodyTilt: 4,
    bounce: "bright",
  },
  celebrating: {
    mouthPath: "M -16 -4 Q 0 16 16 -4",
    eye: { kind: "closed-happy" },
    bodyColor: "#F5B876",
    cheeks: true,
    bodyTilt: 0,
    bounce: "bright",
  },
  tired: {
    mouthPath: "M -10 0 Q 0 -3 10 0",
    eye: { kind: "droopy" },
    bodyColor: "#D99456",
    cheeks: false,
    bodyTilt: 2,
    bounce: "none",
  },
};

export const BUDDY_LABEL: Record<BuddyState, string> = {
  greeting: "Locking in",
  idle: "Here with you",
  observing: "Noticing something",
  nudge: "Gentle nudge",
  "nudge-insistent": "Suggesting a break",
  encouraged: "Nice adjustment",
  celebrating: "Break time!",
  tired: "Running low too",
};
