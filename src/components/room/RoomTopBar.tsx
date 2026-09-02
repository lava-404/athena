"use client";

import clsx from "clsx";
import { MessageSquare, Settings, Users } from "lucide-react";
import { UserMenu } from "@/components/auth/AuthControls";
import type { VisionConnectionStatus } from "@/hooks/useBackendVision";

export type RoomPanel = "none" | "chat" | "people" | "settings";

interface RoomTopBarProps {
  roomId: string;
  isLocked: boolean;
  visionStatus: VisionConnectionStatus;
  activePanel: RoomPanel;
  onTogglePanel: (panel: RoomPanel) => void;
}

export function RoomTopBar({
  roomId,
  isLocked,
  visionStatus,
  activePanel,
  onTogglePanel,
}: RoomTopBarProps) {
  return (
    <header className="flex items-center justify-between border-b border-ink/10 bg-white/70 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber font-display text-sm font-bold text-white">
          F
        </div>
        <div>
          <h1 className="font-display text-sm font-semibold leading-none text-ink">
            FocusRoom
          </h1>
          <p className="text-xs text-ink-soft">{roomId}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <LockPill isLocked={isLocked} visionStatus={visionStatus} />

        <IconToggle
          label="People"
          active={activePanel === "people"}
          onClick={() => onTogglePanel("people")}
        >
          <Users size={17} />
        </IconToggle>
        <IconToggle
          label="Chat"
          active={activePanel === "chat"}
          onClick={() => onTogglePanel("chat")}
        >
          <MessageSquare size={17} />
        </IconToggle>
        <IconToggle
          label="Buddy settings"
          active={activePanel === "settings"}
          onClick={() => onTogglePanel("settings")}
        >
          <Settings size={17} />
        </IconToggle>

        <div className="ml-1 h-6 w-px bg-ink/10" />
        <UserMenu />
      </div>
    </header>
  );
}

function LockPill({
  isLocked,
  visionStatus,
}: {
  isLocked: boolean;
  visionStatus: VisionConnectionStatus;
}) {
  let label = isLocked ? "Locked in with Buddy" : "Not locked in";
  if (isLocked && visionStatus === "connecting") label = "Connecting to Buddy…";
  if (isLocked && visionStatus === "error") label = "Buddy backend unreachable";

  const tone =
    isLocked && visionStatus === "error"
      ? "bg-coral-soft text-coral"
      : isLocked
        ? "bg-sage-soft text-sage-deep"
        : "bg-ink/5 text-ink-soft";

  return (
    <div className={clsx("flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium", tone)}>
      <span
        className={clsx(
          "h-2 w-2 rounded-full",
          isLocked && visionStatus !== "error" ? "animate-pulse bg-sage" : "bg-ink/30"
        )}
      />
      {label}
    </div>
  );
}

function IconToggle({
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
        "flex h-9 w-9 items-center justify-center rounded-full transition",
        active ? "bg-amber text-white" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}
