"""Posture scoring from MediaPipe PoseLandmarker output.

Same heuristic approach as the rest of the product: calibrate to THIS
person's upright baseline in the first couple of seconds of a session, then
score every later frame as a deviation from their own normal rather than a
fixed "ideal" angle. See the project README for the full rationale.

This module also exposes `extract_overlay_points`, which returns the small
set of normalized keypoints the frontend draws as a color-coded skeleton
over the local user's video tile (green while posture matches their
baseline, coral once they're slouching). This is intentionally separate
from `FrameMetrics`/scoring: the overlay should degrade gracefully and show
whatever points ARE visible even on a frame that's too incomplete to
produce a score, whereas scoring needs every required landmark or it bails
out entirely. No posture judgement happens outside this file/websocket
message — the frontend only renders points and a color it's given.
"""
from __future__ import annotations

from dataclasses import dataclass
from math import hypot
from typing import Optional, Sequence

# Indices from MediaPipe's 33-point BlazePose topology.
NOSE, L_EYE, R_EYE = 0, 2, 5
L_EAR, R_EAR = 7, 8
L_SHOULDER, R_SHOULDER = 11, 12
L_HIP, R_HIP = 23, 24

VISIBILITY_MIN = 0.5
CALIBRATION_SAMPLES = 45  # ~2s at the ~2.5 samples/sec the frontend streams

# Keypoints sent to the frontend for the skeleton overlay. Keys here are
# exactly the keys that appear in the "landmarks" object of the "scores"
# websocket message (see app/main.py) and that
# src/components/PostureSkeletonOverlay.tsx expects.
_OVERLAY_LANDMARKS: dict[str, int] = {
    "nose": NOSE,
    "l_ear": L_EAR,
    "r_ear": R_EAR,
    "l_shoulder": L_SHOULDER,
    "r_shoulder": R_SHOULDER,
    "l_hip": L_HIP,
    "r_hip": R_HIP,
}


@dataclass
class FrameMetrics:
    shoulder_width: float
    ear_shoulder_gap: float
    shoulder_mid_x: float
    shoulder_mid_y: float
    hip_mid_x: float
    hip_mid_y: float
    nose_x: float
    nose_offset_from_ear_mid: float


def _mid(a, b) -> tuple[float, float]:
    return ((a.x + b.x) / 2, (a.y + b.y) / 2)


def _dist(ax: float, ay: float, bx: float, by: float) -> float:
    return hypot(ax - bx, ay - by)


def extract_frame_metrics(landmarks: Sequence) -> Optional[FrameMetrics]:
    required = [L_SHOULDER, R_SHOULDER, L_EAR, R_EAR, L_HIP, R_HIP, NOSE]
    for i in required:
        vis = getattr(landmarks[i], "visibility", 1.0)
        if vis is not None and vis < VISIBILITY_MIN:
            return None

    ls, rs = landmarks[L_SHOULDER], landmarks[R_SHOULDER]
    le, re = landmarks[L_EAR], landmarks[R_EAR]
    lh, rh = landmarks[L_HIP], landmarks[R_HIP]
    nose = landmarks[NOSE]

    shoulder_mid_x, shoulder_mid_y = _mid(ls, rs)
    ear_mid_x, ear_mid_y = _mid(le, re)
    hip_mid_x, hip_mid_y = _mid(lh, rh)
    shoulder_width = _dist(ls.x, ls.y, rs.x, rs.y) or 0.0001

    return FrameMetrics(
        shoulder_width=shoulder_width,
        ear_shoulder_gap=shoulder_mid_y - ear_mid_y,
        shoulder_mid_x=shoulder_mid_x,
        shoulder_mid_y=shoulder_mid_y,
        hip_mid_x=hip_mid_x,
        hip_mid_y=hip_mid_y,
        nose_x=nose.x,
        nose_offset_from_ear_mid=nose.x - ear_mid_x,
    )


def extract_overlay_points(landmarks: Sequence) -> Optional[dict[str, tuple[float, float]]]:
    """Return normalized (x, y) keypoints for the frontend's skeleton overlay.

    Unlike `extract_frame_metrics`, this does not require every landmark to
    be present — it includes whichever of the overlay keypoints clear the
    visibility threshold and silently omits the rest, so a partially
    occluded frame still draws a partial skeleton instead of none at all.
    Returns None only when NOT ONE keypoint is visible.
    """
    points: dict[str, tuple[float, float]] = {}
    for name, index in _OVERLAY_LANDMARKS.items():
        landmark = landmarks[index]
        vis = getattr(landmark, "visibility", 1.0)
        if vis is not None and vis < VISIBILITY_MIN:
            continue
        points[name] = (round(landmark.x, 4), round(landmark.y, 4))
    return points or None


def _clamp(n: float, lo: float = 0, hi: float = 100) -> float:
    return max(lo, min(hi, n))


class PostureCalibrator:
    """One instance per session. Learns an upright baseline, then scores
    every subsequent frame against it."""

    def __init__(self) -> None:
        self._samples: list[FrameMetrics] = []
        self._baseline: dict[str, float] | None = None

    @property
    def is_calibrated(self) -> bool:
        return self._baseline is not None

    def add_sample(self, m: FrameMetrics) -> None:
        if self._baseline is not None:
            return
        self._samples.append(m)
        if len(self._samples) >= CALIBRATION_SAMPLES:
            self._finalize()

    def _finalize(self) -> None:
        n = len(self._samples)

        def avg(f):
            return sum(f(s) for s in self._samples) / n

        shoulder_width = avg(lambda s: s.shoulder_width)
        self._baseline = {
            "ear_shoulder_ratio": avg(lambda s: s.ear_shoulder_gap / s.shoulder_width),
            "shoulder_width": shoulder_width,
            "shoulder_hip_ratio": avg(
                lambda s: (s.hip_mid_y - s.shoulder_mid_y) / s.shoulder_width
            ),
            "lean": avg(lambda s: (s.shoulder_mid_x - s.hip_mid_x) / s.shoulder_width),
        }

    def score(self, m: FrameMetrics) -> float:
        if self._baseline is None:
            return 85.0  # neutral default mid-calibration

        b = self._baseline
        ear_shoulder_ratio = m.ear_shoulder_gap / m.shoulder_width
        shoulder_hip_ratio = (m.hip_mid_y - m.shoulder_mid_y) / m.shoulder_width
        lean = (m.shoulder_mid_x - m.hip_mid_x) / m.shoulder_width
        width_ratio = m.shoulder_width / b["shoulder_width"]

        forward_head_drop = max(0.0, b["ear_shoulder_ratio"] - ear_shoulder_ratio)
        slump = max(0.0, b["shoulder_hip_ratio"] - shoulder_hip_ratio)
        side_lean = abs(lean - b["lean"])
        depth_lean = abs(1 - width_ratio)

        score = 100.0
        score -= forward_head_drop * 220
        score -= slump * 260
        score -= side_lean * 140
        score -= max(0.0, depth_lean - 0.12) * 160

        return _clamp(score)