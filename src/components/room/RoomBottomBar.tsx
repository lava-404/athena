"use client";

import { Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff } from "lucide-react";
import clsx from "clsx";

interface RoomBottomBarProps {
  micOn: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
  centerSlot?: React.ReactNode;
}

// Floating, centered, pill-shaped — the Google Meet control bar shape,
// re-skinned in FocusRoom's palette. `centerSlot` lets the room page drop
// the "Lock in with Buddy" CTA in the same visual row without this
// component needing to know about session state.
export function RoomBottomBar({
  micOn,
  cameraOn,
  screenSharing,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onLeave,
  centerSlot,
}: RoomBottomBarProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center gap-3">
      {centerSlot && <div className="pointer-events-auto">{centerSlot}</div>}
      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-ink px-3 py-2.5 shadow-soft">
        <ControlButton active={micOn} onClick={onToggleMic} label={micOn ? "Mute" : "Unmute"}>
          {micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </ControlButton>
        <ControlButton
          active={cameraOn}
          onClick={onToggleCamera}
          label={cameraOn ? "Turn off camera" : "Turn on camera"}
        >
          {cameraOn ? <Video size={18} /> : <VideoOff size={18} />}
        </ControlButton>
        <ControlButton active={screenSharing} onClick={onToggleScreenShare} label="Share screen">
          <MonitorUp size={18} />
        </ControlButton>
        <button
          onClick={onLeave}
          aria-label="Leave meeting"
          title="Leave"
          className="ml-1 flex h-11 w-14 items-center justify-center rounded-full bg-coral text-white transition hover:bg-coral/90"
        >
          <PhoneOff size={18} />
        </button>
      </div>
    </div>
  );
}

function ControlButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx(
        "flex h-11 w-11 items-center justify-center rounded-full transition",
        active ? "bg-white/10 text-paper hover:bg-white/20" : "bg-coral text-white hover:bg-coral/90"
      )}
    >
      {children}
    </button>
  );
}
