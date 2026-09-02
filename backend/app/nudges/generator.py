"""Generates the Buddy's nudge messages via the Anthropic API instead of a
fixed string table, so wording varies and stays in character.

This is the primary and only intended path. The small local fallback lines
at the bottom only exist so a session doesn't go silent if the Anthropic API
call itself fails (network blip, rate limit) — they are not a substitute
implementation, and every successful session uses generated text.
"""
from __future__ import annotations

import logging
from typing import Literal

import anthropic

from app.config import settings

logger = logging.getLogger("focusroom.nudges")

NudgeCategory = Literal["posture", "away", "distracted", "break", "break-insistent"]

SYSTEM_PROMPT = """\
You are "Buddy", a warm, slightly playful companion who sits with someone \
during a focus session in a video call app called FocusRoom. You notice \
posture, attention, and how long someone has been working, and you say a \
short thing about it — never a system alert, never parental, never guilt-\
tripping. You are on their side.

Rules:
- One short sentence. Occasionally two if the second is very short.
- Warm and casual, like a friend who's there with you, not an app.
- Never repeat a phrase you've used before in this conversation.
- Never mention "AI", "detection", "algorithm", "score", or that you are \
software watching them.
- Never sound disappointed or judgmental. Encouraging, not scolding.
- Do not use exclamation points more than once per message.
"""

_CATEGORY_BRIEFS: dict[NudgeCategory, str] = {
    "posture": "Their posture has been slumped/forward for a little while. Gently invite them to sit up or roll their shoulders back.",
    "away": "They've stepped out of the camera's view for a bit. Gently invite them back to the session.",
    "distracted": "They've been looking away from the screen for a while (phone, side monitor, etc). Gently invite them to refocus, without guessing at what distracted them.",
    "break": "They've been working continuously for a while. Gently suggest a short break.",
    "break-insistent": "They've been working a long time AND showing signs of fatigue/decline. More warmly insistent that a real break would help, while still being kind.",
}

# Used ONLY if the Anthropic API call fails. Kept intentionally short and
# varied per category so a transient outage doesn't repeat one line either.
_FALLBACK_LINES: dict[NudgeCategory, list[str]] = {
    "posture": [
        "Hey, shoulders feel a little heavy — want to roll them back with me?",
        "Quick posture check-in: maybe uncurl a bit?",
    ],
    "away": [
        "Whenever you're ready, I'm still here waiting for you.",
        "Come on back whenever you can — no rush.",
    ],
    "distracted": [
        "I've lost you for a bit — want to come back to this with me?",
        "Whenever you're ready to refocus, I'm right here.",
    ],
    "break": [
        "We've been at this a while — a short break might feel good.",
        "This could be a good moment to stretch and reset.",
    ],
    "break-insistent": [
        "We've been going a long time now — let's really take a break this time.",
        "I think you've earned a proper pause. Want to take it?",
    ],
}

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic | None:
    global _client
    if not settings.anthropic_api_key:
        return None
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


def generate_nudge(category: NudgeCategory, recent_messages: list[str]) -> str:
    client = _get_client()
    brief = _CATEGORY_BRIEFS[category]

    if client is None:
        logger.warning("ANTHROPIC_API_KEY not set — using fallback nudge line")
        return _pick_fallback(category, recent_messages)

    avoid = ""
    if recent_messages:
        avoid = (
            "\n\nDon't reuse the phrasing of these recent messages:\n- "
            + "\n- ".join(recent_messages[-4:])
        )

    try:
        response = client.messages.create(
            model=settings.nudge_model,
            max_tokens=60,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Situation: {brief}{avoid}\n\nSay your one thing to them now.",
                }
            ],
        )
        text_blocks = [b.text for b in response.content if b.type == "text"]
        text = " ".join(text_blocks).strip()
        return text or _pick_fallback(category, recent_messages)
    except Exception:  # noqa: BLE001 - genuinely any API failure should fall back, not crash a session
        logger.exception("Anthropic nudge generation failed, using fallback line")
        return _pick_fallback(category, recent_messages)


def _pick_fallback(category: NudgeCategory, recent_messages: list[str]) -> str:
    options = _FALLBACK_LINES[category]
    for opt in options:
        if opt not in recent_messages:
            return opt
    return options[0]
