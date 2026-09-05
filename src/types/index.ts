// Core shared types for FocusRoom.

/** The Buddy's visible emotional/behavioral state. Drives which animation
 * plays and what (if anything) appears in the speech bubble. */
export type BuddyState =
  | "greeting" // the "locking in" ritual at session start
  | "idle" // calm, present, nothing to say
  | "observing" // subtle "thinking" — shown while the backend hasn't finished calibrating yet
  | "nudge" // gentle posture/focus/attention nudge (from the AI backend)
  | "nudge-insistent" // backend's "break-insistent" category
  | "encouraged" // posture/focus recovered after a nudge — small happy reaction
  | "celebrating" // break granted — the "you're free" release
  | "tired"; // long session, ambient fatigue visual (session-length only, not backend-driven)

export type NudgeSensitivity = "gentle" | "normal" | "strict";

/** Mirrors the AI backend's nudge categories exactly
 * (see backend/app/nudges/generator.py NudgeCategory). */
export type NudgeCategory = "posture" | "away" | "distracted" | "break" | "break-insistent";

/** Simple 2-tone read of posture, computed backend-side against the SAME
 * per-sensitivity threshold that drives posture nudges (see
 * backend/app/session/manager.py SENSITIVITY_CONFIG) — so the skeleton
 * overlay's color always agrees with whether Buddy would actually flag
 * this as slouching. */
export type PostureStatus = "good" | "slouching";

/** Normalized (x, y) position of one MediaPipe landmark, each in [0, 1]
 * relative to the raw video frame — NOT the container's rendered size.
 * See PostureSkeletonOverlay for how these map onto the on-screen video. */
export type NormalizedPoint = [number, number];

/** The small set of upper-body keypoints the backend sends for drawing the
 * posture skeleton overlay. Keys match `_OVERLAY_LANDMARKS` in
 * backend/app/vision/pose.py exactly. Any key may be missing if that point
 * wasn't visible enough in this frame — the overlay draws whatever's
 * present rather than requiring the full set. */
export interface PostureLandmarks {
  nose?: NormalizedPoint;
  l_ear?: NormalizedPoint;
  r_ear?: NormalizedPoint;
  l_shoulder?: NormalizedPoint;
  r_shoulder?: NormalizedPoint;
  l_hip?: NormalizedPoint;
  r_hip?: NormalizedPoint;
}

/** One "scores" message from the AI backend's websocket. All inference
 * (posture geometry + gaze/attention) happens in Python — this is just the
 * shape of what comes back. */
export interface BackendScoreMessage {
  type: "scores";
  posture_score: number;
  focus_score: number;
  pose_present: boolean;
  face_present: boolean;
  is_calibrated: boolean;
  posture_status: PostureStatus;
  landmarks: PostureLandmarks | null;
}

export interface BackendNudgeMessage {
  type: "nudge";
  category: NudgeCategory;
  message: string;
}

export interface BackendSessionStartedMessage {
  type: "session_started";
  session_id: string;
}

export type BackendMessage =
  | BackendScoreMessage
  | BackendNudgeMessage
  | BackendSessionStartedMessage;

export interface SessionMetrics {
  postureScore: number;
  focusScore: number;
  fatigueScore: number; // 0–100, ambient, grows with continuous session length only
  sessionSeconds: number;
}

/** One row from the backend's /sessions endpoint (Supabase-backed). */
export interface SessionRecord {
  id: string;
  session_id: string;
  user_id: string;
  room_id: string;
  started_at: string;
  duration_seconds: number;
  posture_nudge_count: number;
  focus_nudge_count: number;
  break_reminder_count: number;
  created_at: string;
}

export interface SessionStats {
  total_sessions: number;
  total_focused_seconds: number;
  avg_posture_nudges_per_session: number;
  avg_focus_nudges_per_session: number;
  avg_break_reminders_per_session: number;
}

export type SessionLockState = "unlocked" | "locking-in" | "locked" | "on-break";

export interface ChatMessage {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

export interface BuddySettings {
  enabled: boolean;
  paused: boolean;
  sensitivity: NudgeSensitivity;
  voiceEnabled: boolean;
}