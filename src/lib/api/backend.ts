import type { SessionRecord, SessionStats } from "@/types";

const HTTP_BASE =
  process.env.NEXT_PUBLIC_BACKEND_HTTP_URL?.replace(/\/$/, "") ?? "http://localhost:8000";
const WS_BASE =
  process.env.NEXT_PUBLIC_BACKEND_WS_URL?.replace(/\/$/, "") ?? "ws://localhost:8000";

async function authedFetch(path: string, accessToken: string) {
  const res = await fetch(`${HTTP_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Backend request to ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchSessions(accessToken: string): Promise<SessionRecord[]> {
  const data = await authedFetch("/sessions", accessToken);
  return data.sessions as SessionRecord[];
}

export async function fetchSessionStats(accessToken: string): Promise<SessionStats> {
  return authedFetch("/sessions/stats", accessToken);
}

/** Builds the URL for the live vision websocket. The Privy access token
 * travels as a query param (not a header) because browsers can't attach
 * custom headers to a WebSocket handshake — the backend verifies it the
 * same way either way (see backend/app/auth.py). */
export function buildVisionSocketUrl(params: {
  accessToken: string;
  roomId: string;
  sensitivity: string;
}): string {
  const q = new URLSearchParams({
    token: params.accessToken,
    room_id: params.roomId,
    sensitivity: params.sensitivity,
  });
  return `${WS_BASE}/ws/vision?${q.toString()}`;
}
