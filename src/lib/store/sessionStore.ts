import { create } from "zustand";
import type {
  BuddyState,
  BuddySettings,
  ChatMessage,
  NudgeCategory,
  NudgeSensitivity,
  SessionLockState,
} from "@/types";

// How long a locked-in session runs before the ambient "tired" visual can
// show. This is NOT what triggers the backend's break nudge — that timer
// lives entirely in the Python backend (app/session/manager.py), since the
// brief requires all posture/attention/duration judgment to live there.
// This is purely a local, decorative signal for the character.
const AMBIENT_FATIGUE_AFTER_MS = 40 * 60_000;
const AMBIENT_FATIGUE_RAMP_MS = 30 * 60_000;

// How long an "encouraged" reaction shows before the Buddy settles back to idle.
const ENCOURAGED_DISPLAY_MS = 2600;

interface SessionStore {
  lockState: SessionLockState;
  buddy: BuddyState;
  speech: string | null;
  nudgeCategory: NudgeCategory | null;
  settings: BuddySettings;

  // Live scores as reported by the AI backend — this store never computes
  // them, it only displays what the backend sent.
  postureScore: number;
  focusScore: number;
  posePresent: boolean;
  facePresent: boolean;
  isCalibrated: boolean;

  fatigueScore: number;
  sessionSeconds: number;
  breakSecondsRemaining: number;

  backendSessionId: string | null;

  chat: ChatMessage[];

  _lockedInAt: number | null;
  _prevPostureBelowThreshold: boolean;

  startLockIn: () => void;
  completeLockIn: () => void;
  tickSession: (deltaMs: number) => void;

  applyBackendScores: (scores: {
    posture_score: number;
    focus_score: number;
    pose_present: boolean;
    face_present: boolean;
    is_calibrated: boolean;
  }) => void;
  applyBackendNudge: (nudge: { category: NudgeCategory; message: string }) => void;
  setBackendSessionId: (id: string | null) => void;

  acknowledgeNudge: (accepted: boolean) => void;
  acceptBreak: () => void;
  tickBreak: (deltaMs: number) => void;
  endBreak: () => void;
  reLock: () => void;
  pauseBuddy: () => void;
  resumeBuddy: () => void;
  setSensitivity: (s: NudgeSensitivity) => void;
  toggleVoice: () => void;
  addChatMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
}

const NUDGE_STATE: Record<NudgeCategory, BuddyState> = {
  posture: "nudge",
  away: "nudge",
  distracted: "nudge",
  break: "nudge",
  "break-insistent": "nudge-insistent",
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  lockState: "unlocked",
  buddy: "idle",
  speech: null,
  nudgeCategory: null,
  settings: {
    enabled: true,
    paused: false,
    sensitivity: "normal",
    voiceEnabled: false,
  },

  postureScore: 85,
  focusScore: 85,
  posePresent: true,
  facePresent: true,
  isCalibrated: false,

  fatigueScore: 0,
  sessionSeconds: 0,
  breakSecondsRemaining: 0,

  backendSessionId: null,

  chat: [],

  _lockedInAt: null,
  _prevPostureBelowThreshold: false,

  startLockIn: () =>
    set({
      lockState: "locking-in",
      buddy: "greeting",
      speech: "Alright, I'm with you. Let's stay present together.",
    }),

  completeLockIn: () =>
    set({
      lockState: "locked",
      buddy: "observing",
      speech: null,
      _lockedInAt: Date.now(),
      sessionSeconds: 0,
      isCalibrated: false,
    }),

  tickSession: (deltaMs) => {
    const { lockState, sessionSeconds } = get();
    if (lockState !== "locked") return;
    const nextSeconds = sessionSeconds + deltaMs / 1000;
    const msIn = nextSeconds * 1000;
    const fatigue =
      msIn <= AMBIENT_FATIGUE_AFTER_MS
        ? 0
        : Math.min(100, ((msIn - AMBIENT_FATIGUE_AFTER_MS) / AMBIENT_FATIGUE_RAMP_MS) * 100);

    set({ sessionSeconds: nextSeconds, fatigueScore: fatigue });

    if (fatigue > 70 && get().buddy === "idle") {
      set({ buddy: "tired" });
    }
  },

  applyBackendScores: (scores) => {
    const state = get();
    const wasCalibrating = !state.isCalibrated;

    set({
      postureScore: scores.posture_score,
      focusScore: scores.focus_score,
      posePresent: scores.pose_present,
      facePresent: scores.face_present,
      isCalibrated: scores.is_calibrated,
    });

    // While the backend is still learning this person's baseline, keep the
    // Buddy in its "observing" pose rather than flashing a false "idle".
    if (wasCalibrating && !scores.is_calibrated) {
      if (state.buddy === "idle") set({ buddy: "observing" });
      return;
    }
    if (wasCalibrating && scores.is_calibrated && state.buddy === "observing") {
      set({ buddy: "idle" });
    }

    // Small local "encouraged" reaction: not a nudge category from the
    // backend, just a nice beat when posture visibly recovers right after
    // a posture nudge was showing.
    const belowThreshold = scores.posture_score < 55;
    if (
      state._prevPostureBelowThreshold &&
      !belowThreshold &&
      state.nudgeCategory === "posture" &&
      (state.buddy === "nudge" || state.buddy === "nudge-insistent")
    ) {
      set({ buddy: "encouraged", speech: "There you go — that's it.", nudgeCategory: null });
      setTimeout(() => {
        if (get().buddy === "encouraged") set({ buddy: "idle", speech: null });
      }, ENCOURAGED_DISPLAY_MS);
    }
    set({ _prevPostureBelowThreshold: belowThreshold });
  },

  applyBackendNudge: (nudge) => {
    set({
      buddy: NUDGE_STATE[nudge.category],
      speech: nudge.message,
      nudgeCategory: nudge.category,
    });
  },

  setBackendSessionId: (id) => set({ backendSessionId: id }),

  acknowledgeNudge: (accepted) => {
    if (accepted) {
      get().acceptBreak();
      return;
    }
    set({ buddy: "idle", speech: null, nudgeCategory: null });
  },

  acceptBreak: () =>
    set({
      buddy: "celebrating",
      speech: "You're free! Go stretch, hydrate, look at something far away.",
      lockState: "on-break",
      breakSecondsRemaining: 5 * 60,
      nudgeCategory: null,
    }),

  tickBreak: (deltaMs) => {
    const { lockState, breakSecondsRemaining } = get();
    if (lockState !== "on-break") return;
    const next = Math.max(0, breakSecondsRemaining - deltaMs / 1000);
    set({ breakSecondsRemaining: next });
  },

  endBreak: () =>
    set({
      lockState: "unlocked",
      buddy: "idle",
      speech: null,
      breakSecondsRemaining: 0,
      fatigueScore: 0,
      _lockedInAt: null,
      backendSessionId: null,
    }),

  reLock: () => get().startLockIn(),

  pauseBuddy: () =>
    set((s) => ({ settings: { ...s.settings, paused: true }, buddy: "idle", speech: null })),

  resumeBuddy: () => set((s) => ({ settings: { ...s.settings, paused: false } })),

  setSensitivity: (sensitivity) => set((s) => ({ settings: { ...s.settings, sensitivity } })),

  toggleVoice: () =>
    set((s) => ({ settings: { ...s.settings, voiceEnabled: !s.settings.voiceEnabled } })),

  addChatMessage: (msg) =>
    set((s) => ({
      chat: [...s.chat, { ...msg, id: crypto.randomUUID(), timestamp: Date.now() }],
    })),
}));
