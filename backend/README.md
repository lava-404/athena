# FocusRoom AI Backend

FastAPI service that owns **all** posture, gaze/attention, and nudge-message
generation. The frontend never runs computer vision itself — it streams
webcam frames over a websocket to this service and gets back scores and
(occasionally) a nudge to show through the Buddy character.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # then fill in the keys below
uvicorn app.main:app --reload --port 8000
```

The first request downloads two MediaPipe model files (~10-15MB total) to
`.model_cache/` — this happens once at startup (see `lifespan` in
`app/main.py`), not per-request.

### Required environment variables

| Variable | Used for | Required to run at all? |
|---|---|---|
| `ANTHROPIC_API_KEY` | Generating nudge text | No — falls back to a small local phrase set if missing/unreachable, but you want this set for the real feature |
| `PRIVY_APP_ID`, `PRIVY_VERIFICATION_KEY` | Verifying who's connecting | **Yes** — every route requires a valid Privy token |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Session history | No — sessions just won't persist (logged, not fatal) |
| `CORS_ORIGINS` | Letting the Next.js app call this API | Yes, defaults to `http://localhost:3000` |

See `.env.example` for the full list.

## API surface

- `GET /health` — liveness check, no auth.
- `WS /ws/vision?token=<privy_access_token>&room_id=<id>&sensitivity=normal`
  One connection = one session. Client sends:
  - `{"type": "frame", "data": "<base64 JPEG>"}` — analyze one frame
  - `{"type": "sensitivity", "value": "gentle" | "normal" | "strict"}`

  Server sends:
  - `{"type": "session_started", "session_id": "..."}`
  - `{"type": "scores", "posture_score": 0-100, "focus_score": 0-100, "pose_present": bool, "face_present": bool, "is_calibrated": bool}`
  - `{"type": "nudge", "category": "posture"|"away"|"distracted"|"break"|"break-insistent", "message": "..."}`

  On disconnect, the session is finalized and persisted to Supabase.
- `GET /sessions` — the calling user's session history (requires `Authorization: Bearer <privy token>`).
- `GET /sessions/stats` — aggregate stats for the dashboard.

## Module map

```
app/
  main.py                FastAPI app, websocket loop, REST routes
  config.py               env-driven settings
  auth.py                  Privy access-token verification (offline, ES256)
  vision/
    models.py              downloads/caches .task files, builds landmarkers
    pose.py                 posture: landmark geometry + per-session calibration
    gaze.py                 attention: head orientation + eye-look blendshapes
  nudges/
    generator.py            Anthropic API call -> nudge text, with fallback lines
  session/
    manager.py               timing/threshold state machine -> WHEN to nudge
    store.py                  Supabase reads/writes
```

## Why per-connection model instances

`PoseLandmarker`/`FaceLandmarker` run in `VIDEO` mode, which keeps internal
tracking state and expects strictly increasing timestamps *for that
instance*. A fresh pair of landmarkers is created per websocket connection
(see `app/vision/models.py`) so concurrent users can never corrupt each
other's tracking state. The `.task` model files are cached on disk after
the first download, so this only costs a bit of in-memory init time per
connection, not a re-download.

## Testing without real credentials

`GET /health` and the pose/gaze math work with no configuration. The
websocket route requires a valid Privy token by design (see `app/auth.py`),
since it's the same trust boundary the dashboard relies on — there's no
"dev bypass" flag, on purpose.
