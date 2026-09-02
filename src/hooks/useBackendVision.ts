"use client";

import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import type { BackendMessage } from "@/types";
import { buildVisionSocketUrl } from "@/lib/api/backend";
import { useSessionStore } from "@/lib/store/sessionStore";

const FRAME_INTERVAL_MS = 400; // ~2.5 fps — plenty for slow-moving posture/attention signals
const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 240;
const JPEG_QUALITY = 0.6;

export type VisionConnectionStatus =
  | "idle"
  | "connecting"
  | "streaming"
  | "reconnecting"
  | "error";

interface Options {
  videoRef: React.RefObject<HTMLVideoElement>;
  roomId: string;
  active: boolean; // camera on AND locked-in AND buddy enabled/not paused
}

/** Owns the ONLY connection between this browser tab and the AI backend.
 * No posture/gaze inference happens here or anywhere else in the frontend —
 * this hook just grabs frames off the video element, ships them to the
 * Python backend over a websocket, and applies whatever comes back. */
export function useBackendVision({ videoRef, roomId, active }: Options) {
  const { getAccessToken, authenticated } = usePrivy();
  const [status, setStatus] = useState<VisionConnectionStatus>("idle");

  const applyBackendScores = useSessionStore((s) => s.applyBackendScores);
  const applyBackendNudge = useSessionStore((s) => s.applyBackendNudge);
  const setBackendSessionId = useSessionStore((s) => s.setBackendSessionId);
  const sensitivity = useSessionStore((s) => s.settings.sensitivity);

  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep the backend's per-session sensitivity in sync with live setting changes.
  useEffect(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "sensitivity", value: sensitivity }));
    }
  }, [sensitivity]);

  useEffect(() => {
    if (!active || !authenticated) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    canvasRef.current = document.createElement("canvas");
    canvasRef.current.width = FRAME_WIDTH;
    canvasRef.current.height = FRAME_HEIGHT;

    (async () => {
      setStatus("connecting");
      const token = await getAccessToken();
      if (cancelled || !token) {
        setStatus("error");
        return;
      }

      const url = buildVisionSocketUrl({
        accessToken: token,
        roomId,
        sensitivity,
      });
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        setStatus("streaming");
        intervalRef.current = setInterval(() => {
          sendFrame(ws, videoRef.current, canvasRef.current);
        }, FRAME_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        try {
          const data: BackendMessage = JSON.parse(event.data);
          if (data.type === "scores") {
            applyBackendScores(data);
          } else if (data.type === "nudge") {
            applyBackendNudge(data);
          } else if (data.type === "session_started") {
            setBackendSessionId(data.session_id);
          }
        } catch {
          // ignore malformed frames rather than tearing down the connection
        }
      };

      ws.onerror = () => {
        if (!cancelled) setStatus("error");
      };

      ws.onclose = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (!cancelled) setStatus("idle");
      };
    })();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, authenticated, roomId]);

  return { status };
}

function sendFrame(
  ws: WebSocket,
  video: HTMLVideoElement | null,
  canvas: HTMLCanvasElement | null
) {
  if (!video || !canvas || video.readyState < 2 || ws.readyState !== WebSocket.OPEN) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  ws.send(JSON.stringify({ type: "frame", data: dataUrl }));
}
