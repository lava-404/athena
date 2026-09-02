"""Gaze / attention scoring from MediaPipe FaceLandmarker output.

Combines two real signals rather than picking one:
  1. Head orientation, from face geometry (nose tip vs. eye-corner midpoint,
     normalized by inter-eye distance) — catches "turned away from the screen".
  2. Eye-only gaze, from the model's face blendshapes (eyeLookOutLeft/Right,
     eyeLookUpLeft/Right, etc.) — catches "head still, eyes have wandered",
     e.g. glancing at a phone beside the webcam.

If no face is detected at all, that's handled by the caller (session
manager) as a distinct "looking away / not oriented to screen" signal,
separate from "body not in frame" (which comes from the pose model).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Sequence

# Canonical MediaPipe FaceMesh landmark indices.
NOSE_TIP = 1
LEFT_EYE_OUTER = 33
RIGHT_EYE_OUTER = 263
LEFT_EYE_INNER = 133
RIGHT_EYE_INNER = 362

# Blendshape categories (ARKit-style, output by FaceLandmarker) that
# indicate the eyes have shifted off-center, in either direction.
EYE_WANDER_BLENDSHAPES = (
    "eyeLookOutLeft",
    "eyeLookOutRight",
    "eyeLookInLeft",
    "eyeLookInRight",
    "eyeLookUpLeft",
    "eyeLookUpRight",
)


@dataclass
class GazeMetrics:
    yaw_offset: float  # signed, normalized by inter-eye distance
    pitch_offset: float
    eye_wander_score: float  # 0-1, higher = eyes more off-center


def extract_gaze_metrics(
    face_landmarks: Sequence,
    blendshapes: Sequence,
) -> Optional[GazeMetrics]:
    if not face_landmarks:
        return None

    nose = face_landmarks[NOSE_TIP]
    l_eye = face_landmarks[LEFT_EYE_OUTER]
    r_eye = face_landmarks[RIGHT_EYE_OUTER]
    l_inner = face_landmarks[LEFT_EYE_INNER]
    r_inner = face_landmarks[RIGHT_EYE_INNER]

    eye_mid_x = (l_eye.x + r_eye.x) / 2
    eye_mid_y = (l_eye.y + r_eye.y) / 2
    inter_eye_dist = abs(l_eye.x - r_eye.x) or 0.0001

    yaw_offset = (nose.x - eye_mid_x) / inter_eye_dist
    pitch_offset = (nose.y - eye_mid_y) / inter_eye_dist

    eye_wander_score = 0.0
    if blendshapes:
        scores = {b.category_name: b.score for b in blendshapes}
        relevant = [scores.get(name, 0.0) for name in EYE_WANDER_BLENDSHAPES]
        eye_wander_score = max(relevant) if relevant else 0.0

    return GazeMetrics(
        yaw_offset=yaw_offset, pitch_offset=pitch_offset, eye_wander_score=eye_wander_score
    )


def _clamp(n: float, lo: float = 0, hi: float = 100) -> float:
    return max(lo, min(hi, n))


def compute_focus_score(m: Optional[GazeMetrics]) -> float:
    """Returns 0-100. A missing face (m is None) is scored low but the
    caller decides whether that means "looking away" vs. "not in frame" —
    this function only knows about orientation, not presence."""
    if m is None:
        return 15.0

    orientation_penalty = abs(m.yaw_offset) * 260 + max(0.0, abs(m.pitch_offset) - 0.15) * 160
    orientation_score = _clamp(100 - orientation_penalty)
    eye_score = _clamp(100 - m.eye_wander_score * 130)

    return _clamp(orientation_score * 0.65 + eye_score * 0.35)
