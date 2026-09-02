"""The Buddy's actual "judgment" for one active session: how long has
posture been bad, how long has the user been away or distracted, how long
have they been working — and when (if ever) to actually say something.

One instance of SessionState lives per active websocket connection. It owns
no vision/model code (that's app/vision/*) and no LLM calls (that's
app/nudges/generator.py) — it's purely the timing/threshold state machine
that decides *when* a nudge should fire and *which* category it is.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Literal, Optional

from app.config import settings
from app.nudges.generator import NudgeCategory, generate_nudge

Sensitivity = Literal["gentle", "normal", "strict"]


@dataclass
class SensitivityConfig:
    posture_threshold: float
    focus_threshold: float
    sustained_seconds: float
    renudge_cooldown_seconds: float


SENSITIVITY_CONFIG: dict[Sensitivity, SensitivityConfig] = {
    "gentle": SensitivityConfig(50, 45, 90, 180),
    "normal": SensitivityConfig(62, 55, 60, 120),
    "strict": SensitivityConfig(72, 65, 30, 75),
}

INSISTENT_AFTER_SECONDS = 20 * 60  # extra continuous time past the first break nudge


@dataclass
class NudgeEvent:
    category: NudgeCategory
    message: str


@dataclass
class SessionState:
    user_id: str
    room_id: str
    sensitivity: Sensitivity = "normal"

    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    start_monotonic: float = field(default_factory=time.monotonic)
    started_at_iso: str = ""

    posture_nudge_count: int = 0
    focus_nudge_count: int = 0
    break_reminder_count: int = 0

    _low_posture_since: Optional[float] = None
    _low_focus_since: Optional[float] = None
    _absence_since: Optional[float] = None
    _last_nudge_at: dict[str, float] = field(default_factory=dict)
    _recent_messages: list[str] = field(default_factory=list)
    _break_ever_sent: bool = False

    def _cooldown_ok(self, category: str, now: float) -> bool:
        cfg = SENSITIVITY_CONFIG[self.sensitivity]
        last = self._last_nudge_at.get(category)
        return last is None or (now - last) >= cfg.renudge_cooldown_seconds

    async def ingest(
        self,
        *,
        posture_score: float,
        focus_score: float,
        pose_present: bool,
        face_present: bool,
    ) -> Optional[NudgeEvent]:
        now = time.monotonic()
        cfg = SENSITIVITY_CONFIG[self.sensitivity]

        # 1. Continuous work duration — independent of posture/focus quality.
        elapsed = now - self.start_monotonic
        if elapsed >= settings.break_nudge_after_seconds and self._cooldown_ok("break", now):
            insistent = self._break_ever_sent and elapsed >= (
                settings.break_nudge_after_seconds + INSISTENT_AFTER_SECONDS
            )
            category: NudgeCategory = "break-insistent" if insistent else "break"
            self._break_ever_sent = True
            self.break_reminder_count += 1
            return await self._fire(category, now)

        # 2. Away from camera — highest-priority attention signal, since the
        #    person is literally not there.
        if not pose_present:
            if self._absence_since is None:
                self._absence_since = now
            elif (
                now - self._absence_since >= settings.absence_nudge_after_seconds
                and self._cooldown_ok("away", now)
            ):
                self.focus_nudge_count += 1
                return await self._fire("away", now)
            return None
        else:
            self._absence_since = None

        # 3. Distracted (present, but not oriented to the screen).
        distracted_now = (not face_present) or (focus_score < cfg.focus_threshold)
        if distracted_now:
            if self._low_focus_since is None:
                self._low_focus_since = now
            elif (
                now - self._low_focus_since >= cfg.sustained_seconds
                and self._cooldown_ok("distracted", now)
            ):
                self.focus_nudge_count += 1
                return await self._fire("distracted", now)
        else:
            self._low_focus_since = None

        # 4. Posture.
        if posture_score < cfg.posture_threshold:
            if self._low_posture_since is None:
                self._low_posture_since = now
            elif (
                now - self._low_posture_since >= cfg.sustained_seconds
                and self._cooldown_ok("posture", now)
            ):
                self.posture_nudge_count += 1
                return await self._fire("posture", now)
        else:
            self._low_posture_since = None

        return None

    async def _fire(self, category: NudgeCategory, now: float) -> NudgeEvent:
        self._last_nudge_at[category] = now
        message = await _generate(category, self._recent_messages)
        self._recent_messages.append(message)
        self._recent_messages = self._recent_messages[-6:]
        return NudgeEvent(category=category, message=message)

    def finalize(self) -> dict:
        duration = time.monotonic() - self.start_monotonic
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "room_id": self.room_id,
            "started_at": self.started_at_iso,
            "duration_seconds": int(duration),
            "posture_nudge_count": self.posture_nudge_count,
            "focus_nudge_count": self.focus_nudge_count,
            "break_reminder_count": self.break_reminder_count,
        }


async def _generate(category: NudgeCategory, recent_messages: list[str]) -> str:
    import asyncio

    return await asyncio.to_thread(generate_nudge, category, recent_messages)
