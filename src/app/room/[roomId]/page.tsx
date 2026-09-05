"use client";

import { useCallback, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { VideoTile } from "@/components/VideoTile";
import { ChatPanel } from "@/components/ChatPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { PeoplePanel } from "@/components/room/PeoplePanel";
import { BuddyPanel } from "@/components/Buddy/BuddyPanel";
import { LockInRitual, BreakOverlay } from "@/components/LockedInOverlay";
import { RoomTopBar, type RoomPanel } from "@/components/room/RoomTopBar";
import { RoomBottomBar } from "@/components/room/RoomBottomBar";

import { useWebcam } from "@/hooks/useWebcam";
import { useBackendVision } from "@/hooks/useBackendVision";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import { useSessionStore } from "@/lib/store/sessionStore";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const { ready, authenticated } = useRequireAuth();

  const { videoRef, permission, cameraOn, micOn, requestAccess, toggleCamera, toggleMic } =
    useWebcam();
  const [screenSharing, setScreenSharing] = useState(false);
  const screenRef = useRef<HTMLVideoElement | null>(null);
  const [sidePanel, setSidePanel] = useState<RoomPanel>("none");

  const lockState = useSessionStore((s) => s.lockState);
  const settings = useSessionStore((s) => s.settings);
  const startLockIn = useSessionStore((s) => s.startLockIn);

  // Live posture read from the AI backend, for the skeleton overlay on the
  // local video tile. Only meaningful (and only drawn) once locked in,
  // calibrated, and the backend currently sees a body in frame.
  const postureLandmarks = useSessionStore((s) => s.postureLandmarks);
  const postureStatus = useSessionStore((s) => s.postureStatus);
  const isCalibrated = useSessionStore((s) => s.isCalibrated);
  const posePresent = useSessionStore((s) => s.posePresent);

  useSessionTimer();
  const { status: visionStatus } = useBackendVision({
    videoRef,
    roomId: params.roomId,
    active:
      lockState === "locked" &&
      cameraOn &&
      settings.enabled &&
      !settings.paused &&
      permission === "granted",
  });

  const toggleScreenShare = useCallback(async () => {
    if (screenSharing) {
      setScreenSharing(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      if (screenRef.current) screenRef.current.srcObject = stream;
      setScreenSharing(true);
      stream.getVideoTracks()[0].onended = () => setScreenSharing(false);
    } catch {
      // user cancelled the native picker — no-op
    }
  }, [screenSharing]);

  const togglePanel = useCallback((panel: RoomPanel) => {
    setSidePanel((p) => (p === panel ? "none" : panel));
  }, []);

  if (!ready || !authenticated) {
    return <div className="flex h-screen items-center justify-center bg-paper" />;
  }

  const isLocked = lockState === "locked";
  // Screen-sharing swaps the local tile's video feed to the screen capture,
  // which the backend never sees — so the posture overlay only makes sense
  // while the actual webcam feed is what's on screen.
  const showPostureOverlay = isLocked && !screenSharing && isCalibrated && posePresent;

  return (
    <div className="flex h-screen flex-col bg-paper">
      <RoomTopBar
        roomId={params.roomId}
        isLocked={isLocked}
        visionStatus={visionStatus}
        activePanel={sidePanel}
        onTogglePanel={togglePanel}
      />

      <main className="flex flex-1 gap-4 overflow-hidden p-4">
        {/* Stage: video grid + floating controls, Meet-style */}
        <div className="relative flex-1 overflow-hidden rounded-3xl bg-teal/5">
          {permission !== "granted" ? (
            <PermissionGate permission={permission} onRequest={requestAccess} />
          ) : (
            <div className="grid h-full grid-cols-1 gap-4 p-4 sm:grid-cols-2">
              <VideoTile
                videoRef={screenSharing ? screenRef : videoRef}
                name="You"
                cameraOn={screenSharing ? true : cameraOn}
                micOn={micOn}
                isLocal
                postureLandmarks={postureLandmarks}
                postureStatus={postureStatus}
                showPostureOverlay={showPostureOverlay}
              />
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-ink/15 text-sm text-ink-soft">
                Waiting for others to join · share the room link to invite them
              </div>
            </div>
          )}

          <RoomBottomBar
            micOn={micOn}
            cameraOn={cameraOn}
            screenSharing={screenSharing}
            onToggleMic={toggleMic}
            onToggleCamera={toggleCamera}
            onToggleScreenShare={toggleScreenShare}
            onLeave={() => router.push("/")}
            centerSlot={
              permission === "granted" && !isLocked && lockState !== "on-break" ? (
                <button
                  onClick={startLockIn}
                  className="rounded-full bg-amber px-5 py-2.5 text-sm font-medium text-white shadow-soft transition hover:bg-amber-deep"
                >
                  Lock in with Buddy
                </button>
              ) : undefined
            }
          />
        </div>

        {/* Buddy stays permanently visible to the local user, per the
            product's core requirement — it's not one of the toggleable panels. */}
        <div className="flex w-[280px] flex-shrink-0 flex-col gap-4">
          <div className="h-[380px]">
            <BuddyPanel />
          </div>
          <AnimatePresence mode="wait">
            {sidePanel !== "none" && (
              <motion.div
                key={sidePanel}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="flex-1 overflow-hidden"
              >
                {sidePanel === "chat" && <ChatPanel onClose={() => setSidePanel("none")} />}
                {sidePanel === "settings" && (
                  <SettingsPanel onClose={() => setSidePanel("none")} />
                )}
                {sidePanel === "people" && <PeoplePanel onClose={() => setSidePanel("none")} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {lockState === "locking-in" && <LockInRitual key="lock-in" />}
        {lockState === "on-break" && <BreakOverlay key="break" />}
      </AnimatePresence>
    </div>
  );
}

function PermissionGate({
  permission,
  onRequest,
}: {
  permission: string;
  onRequest: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <p className="font-display text-lg font-medium text-ink">
        Turn on your camera to join
      </p>
      <p className="max-w-sm text-sm text-ink-soft">
        Buddy sends your video to a private AI backend you control for posture
        and focus analysis — nothing is sent anywhere else. Turn this off any
        time from settings.
      </p>
      <button
        onClick={onRequest}
        className="rounded-full bg-amber px-5 py-2.5 text-sm font-medium text-white shadow-soft transition hover:bg-amber-deep"
      >
        {permission === "requesting" ? "Requesting…" : "Enable camera & mic"}
      </button>
      {permission === "denied" && (
        <p className="text-xs text-coral">
          Camera access was denied — check your browser&apos;s site settings and try again.
        </p>
      )}
    </div>
  );
}