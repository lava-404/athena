"""Central config for the FocusRoom AI backend. Everything reads from the
environment (see .env.example) so nothing sensitive is hardcoded."""
from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


def _list_env(name: str, default: str) -> list[str]:
    raw = os.getenv(name, default)
    return [o.strip() for o in raw.split(",") if o.strip()]


@dataclass(frozen=True)
class Settings:
    # --- Server ---
    cors_origins: list[str] = field(
        default_factory=lambda: _list_env("CORS_ORIGINS", "http://localhost:3000")
    )
    model_cache_dir: str = os.getenv("MODEL_CACHE_DIR", "./.model_cache")

    # --- Anthropic (AI-generated nudges) ---
    anthropic_api_key: str | None = os.getenv("ANTHROPIC_API_KEY")
    nudge_model: str = os.getenv("NUDGE_MODEL", "claude-haiku-4-5-20251001")

    # --- Privy (auth token verification) ---
    privy_app_id: str | None = os.getenv("PRIVY_APP_ID")
    # PEM-formatted ES256 public verification key from the Privy dashboard
    # (Dashboard -> App Settings -> Access Tokens). Verifying locally with
    # this key means no network round-trip to Privy per request.
    privy_verification_key: str | None = os.getenv("PRIVY_VERIFICATION_KEY")

    # --- Supabase (session persistence) ---
    supabase_url: str | None = os.getenv("SUPABASE_URL")
    supabase_service_role_key: str | None = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    # --- Nudge tuning ---
    # Continuous work duration before a break nudge fires, regardless of
    # posture/focus — mirrors the product brief's ~45-55 minute window.
    break_nudge_after_seconds: int = int(os.getenv("BREAK_NUDGE_AFTER_SECONDS", 45 * 60))
    # How long the camera can fail to detect a person before we nudge them
    # back — short, because "stepped away" is unambiguous once landmarks vanish.
    absence_nudge_after_seconds: int = int(os.getenv("ABSENCE_NUDGE_AFTER_SECONDS", 12))


settings = Settings()
