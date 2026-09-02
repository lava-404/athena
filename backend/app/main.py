from __future__ import annotations

import base64
import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import cv2
import numpy as np
from fastapi import FastAPI, Header, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from mediapipe import Image, ImageFormat

from app.auth import require_user_id_http, require_user_id_ws
from app.config import settings
from app.session import store
from app.session.manager import SENSITIVITY_CONFIG, SessionState
from app.vision.gaze import compute_focus_score, extract_gaze_metrics
from app.vision.models import create_face_landmarker, create_pose_landmarker, ensure_models_downloaded
from app.vision.pose import PostureCalibrator, extract_frame_metrics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("focusroom.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Downloading/verifying MediaPipe models…")
    ensure_models_downloaded()
    logger.info("Models ready.")
    yield


app = FastAPI(title="FocusRoom AI Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/sessions")
async def get_sessions(authorization: str | None = Header(default=None)):
    user_id = require_user_id_http(authorization)
    return {"sessions": store.list_sessions(user_id)}


@app.get("/sessions/stats")
async def get_session_stats(authorization: str | None = Header(default=None)):
    user_id = require_user_id_http(authorization)
    return store.get_stats(user_id)


def _decode_frame(b64_data: str) -> np.ndarray | None:
    if "," in b64_data:
        b64_data = b64_data.split(",", 1)[1]
    try:
        raw = base64.b64decode(b64_data)
    except Exception:
        return None
    arr = np.frombuffer(raw, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        return None
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)


@app.websocket("/ws/vision")
async def vision_socket(websocket: WebSocket, token: str | None = None, room_id: str = "unknown", sensitivity: str = "normal"):
    user_id = require_user_id_ws(token)
    await websocket.accept()

    session = SessionState(
        user_id=user_id,
        room_id=room_id,
        sensitivity=sensitivity if sensitivity in SENSITIVITY_CONFIG else "normal",
        started_at_iso=datetime.now(timezone.utc).isoformat(),
    )
    await websocket.send_json({"type": "session_started", "session_id": session.session_id})

    pose_landmarker = create_pose_landmarker()
    face_landmarker = create_face_landmarker()
    calibrator = PostureCalibrator()
    frame_index = 0

    logger.info("Vision session %s started for user %s in room %s", session.session_id, user_id, room_id)

    try:
        while True:
            msg = await websocket.receive_json()
            msg_type = msg.get("type")

            if msg_type == "sensitivity":
                value = msg.get("value")
                if value in SENSITIVITY_CONFIG:
                    session.sensitivity = value
                continue

            if msg_type != "frame":
                continue

            rgb = _decode_frame(msg.get("data", ""))
            if rgb is None:
                continue

            frame_index += 1
            timestamp_ms = int(time.monotonic() * 1000)
            mp_image = Image(image_format=ImageFormat.SRGB, data=rgb)

            pose_result = pose_landmarker.detect_for_video(mp_image, timestamp_ms)
            face_result = face_landmarker.detect_for_video(mp_image, timestamp_ms)

            pose_present = bool(pose_result.pose_landmarks)
            posture_score = 60.0  # neutral-ish if we briefly lose the body
            if pose_present:
                metrics = extract_frame_metrics(pose_result.pose_landmarks[0])
                if metrics is not None:
                    calibrator.add_sample(metrics)
                    posture_score = calibrator.score(metrics)

            face_present = bool(face_result.face_landmarks)
            gaze_metrics = None
            if face_present:
                blendshapes = face_result.face_blendshapes[0] if face_result.face_blendshapes else []
                gaze_metrics = extract_gaze_metrics(face_result.face_landmarks[0], blendshapes)
            focus_score = compute_focus_score(gaze_metrics)

            await websocket.send_json(
                {
                    "type": "scores",
                    "posture_score": round(posture_score, 1),
                    "focus_score": round(focus_score, 1),
                    "pose_present": pose_present,
                    "face_present": face_present,
                    "is_calibrated": calibrator.is_calibrated,
                }
            )

            nudge = await session.ingest(
                posture_score=posture_score,
                focus_score=focus_score,
                pose_present=pose_present,
                face_present=face_present,
            )
            if nudge is not None:
                await websocket.send_json(
                    {"type": "nudge", "category": nudge.category, "message": nudge.message}
                )

    except WebSocketDisconnect:
        logger.info("Vision session %s disconnected", session.session_id)
    finally:
        pose_landmarker.close()
        face_landmarker.close()
        record = session.finalize()
        try:
            store.insert_session(record)
            logger.info("Session %s persisted to Supabase", session.session_id)
        except Exception:  # noqa: BLE001
            logger.exception(
                "Could not persist session %s to Supabase (is it configured?)", session.session_id
            )
