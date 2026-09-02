"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type WebcamPermission = "idle" | "requesting" | "granted" | "denied";

/** Owns the local camera stream and exposes a video ref to attach it to.
 *
 * Bug fix: the stream used to be assigned to `videoRef.current.srcObject`
 * only once, inline inside `requestAccess()`, at the exact moment
 * permission was granted. That's a race: `getUserMedia()` resolves before
 * React has committed the re-render that swaps the permission gate for the
 * actual video tile, so `videoRef.current` was still whatever it was
 * before (often null) when we tried to attach the stream — camera light
 * turns on, but the element that eventually mounts never receives it.
 *
 * The fix is to stop attaching the stream inline and instead do it in an
 * effect keyed on `permission`: refs are guaranteed to be attached to their
 * DOM nodes before effects run for that same commit, so by the time this
 * effect fires after `permission` flips to "granted", `videoRef.current`
 * is the real, mounted <video> element. */
export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [permission, setPermission] = useState<WebcamPermission>("idle");
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  const requestAccess = useCallback(async () => {
    setPermission("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      setPermission("granted");
    } catch {
      setPermission("denied");
    }
  }, []);

  useEffect(() => {
    if (permission === "granted" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [permission]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraOn((prev) => {
      const next = !prev;
      streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }, []);

  const toggleMic = useCallback(() => {
    setMicOn((prev) => {
      const next = !prev;
      streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }, []);

  return {
    videoRef,
    streamRef,
    permission,
    cameraOn,
    micOn,
    requestAccess,
    toggleCamera,
    toggleMic,
  };
}
