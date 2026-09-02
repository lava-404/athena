"""Downloads and caches the MediaPipe Tasks model files, and builds fresh
PoseLandmarker / FaceLandmarker instances.

Each websocket session gets its OWN landmarker instances (see
app/session/manager.py) rather than sharing one globally. MediaPipe's VIDEO
running mode keeps internal tracking state and expects strictly increasing
timestamps per instance — sharing one instance across concurrent users would
corrupt tracking between them. Instances are cheap to construct once the
.task file is cached on disk, so this trades a little startup latency per
connection for correctness under concurrency.
"""
from __future__ import annotations

import os
import urllib.request

from mediapipe.tasks.python import vision
from mediapipe.tasks.python.core.base_options import BaseOptions

from app.config import settings

POSE_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
)
FACE_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/1/face_landmarker.task"
)


def _ensure_cached(url: str, filename: str) -> str:
    os.makedirs(settings.model_cache_dir, exist_ok=True)
    path = os.path.join(settings.model_cache_dir, filename)
    if not os.path.exists(path):
        urllib.request.urlretrieve(url, path)
    return path


def ensure_models_downloaded() -> None:
    """Called once at app startup so the first real user isn't the one
    waiting on the download."""
    _ensure_cached(POSE_MODEL_URL, "pose_landmarker_lite.task")
    _ensure_cached(FACE_MODEL_URL, "face_landmarker.task")


def create_pose_landmarker() -> vision.PoseLandmarker:
    model_path = _ensure_cached(POSE_MODEL_URL, "pose_landmarker_lite.task")
    options = vision.PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model_path),
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    return vision.PoseLandmarker.create_from_options(options)


def create_face_landmarker() -> vision.FaceLandmarker:
    model_path = _ensure_cached(FACE_MODEL_URL, "face_landmarker.task")
    options = vision.FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model_path),
        running_mode=vision.RunningMode.VIDEO,
        num_faces=1,
        min_face_detection_confidence=0.5,
        min_tracking_confidence=0.5,
        output_face_blendshapes=True,
        output_facial_transformation_matrixes=True,
    )
    return vision.FaceLandmarker.create_from_options(options)
