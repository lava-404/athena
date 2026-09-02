"""All Supabase reads/writes live here, using the service role key — the
Python backend is the only thing that talks to Supabase; the Next.js
dashboard calls this backend's REST routes instead of Supabase directly, so
there's exactly one place credentials and access rules live.

See supabase/schema.sql for the table definition + RLS policy (RLS locks
the table down entirely to the service role, since the "user is who they
say they are" check happens up in app/auth.py via the Privy token, not via
Supabase's own auth).
"""
from __future__ import annotations

from typing import Any

from supabase import Client, create_client

from app.config import settings

_client: Client | None = None


class SupabaseNotConfigured(Exception):
    pass


def get_client() -> Client:
    global _client
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SupabaseNotConfigured(
            "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set."
        )
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client


def insert_session(record: dict[str, Any]) -> dict[str, Any]:
    client = get_client()
    result = client.table("sessions").insert(record).execute()
    return result.data[0] if result.data else record


def list_sessions(user_id: str, limit: int = 50) -> list[dict[str, Any]]:
    client = get_client()
    result = (
        client.table("sessions")
        .select("*")
        .eq("user_id", user_id)
        .order("started_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


def get_stats(user_id: str) -> dict[str, Any]:
    sessions = list_sessions(user_id, limit=200)
    if not sessions:
        return {
            "total_sessions": 0,
            "total_focused_seconds": 0,
            "avg_posture_nudges_per_session": 0,
            "avg_focus_nudges_per_session": 0,
            "avg_break_reminders_per_session": 0,
        }

    total = len(sessions)
    total_seconds = sum(s.get("duration_seconds", 0) or 0 for s in sessions)
    return {
        "total_sessions": total,
        "total_focused_seconds": total_seconds,
        "avg_posture_nudges_per_session": round(
            sum(s.get("posture_nudge_count", 0) or 0 for s in sessions) / total, 2
        ),
        "avg_focus_nudges_per_session": round(
            sum(s.get("focus_nudge_count", 0) or 0 for s in sessions) / total, 2
        ),
        "avg_break_reminders_per_session": round(
            sum(s.get("break_reminder_count", 0) or 0 for s in sessions) / total, 2
        ),
    }
