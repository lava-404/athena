"use client";

import { MicOff, VideoOff } from "lucide-react";
import type { RefObject } from "react";

interface VideoTileProps {
  videoRef?: RefObject<HTMLVideoElement>;
  name: string;
  cameraOn: boolean;
  micOn: boolean;
  isLocal?: boolean;
}

export function VideoTile({ videoRef, name, cameraOn, micOn, isLocal }: VideoTileProps) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-teal shadow-soft">
      {cameraOn ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal}
          playsInline
          className="h-full w-full scale-x-[-1] object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-teal">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-soft text-xl font-semibold text-paper">
            {name.slice(0, 1).toUpperCase()}
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-xs text-white backdrop-blur">
        {!micOn && <MicOff size={12} />}
        {!cameraOn && <VideoOff size={12} />}
        <span>{name}{isLocal ? " (you)" : ""}</span>
      </div>
    </div>
  );
}
