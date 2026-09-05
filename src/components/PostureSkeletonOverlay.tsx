"use client";

/**
 * Draws the color-coded posture skeleton over the local user's <video>
 * element: green ("good", using the app's `sage` token) while posture
 * matches their calibrated baseline, coral once the backend says they're
 * slouching — coral being the palette's color already reserved for nudges,
 * so this stays visually consistent with the rest of the app's language.
 *
 * All inference happens in the Python backend (see backend/app/vision/pose.py
 * and backend/app/main.py) — this component only places dots/lines at the
 * normalized coordinates it's given and picks a color for the status it's
 * given. No posture judgement of any kind lives here.
 *
 * Coordinate mapping: MediaPipe's landmark.x/y are fractions (0–1) of the
 * RAW video frame, independent of however that frame was later resized to
 * send to the backend. The on-screen <video> uses object-cover, which
 * scales-to-fill and crops rather than showing the raw frame 1:1 — so this
 * component reproduces object-cover's own geometry (via the video's
 * intrinsic videoWidth/videoHeight vs. its rendered box) to place points
 * correctly regardless of crop. The overlay is mirrored with the same
 * `scale-x-[-1]` the video itself uses, so both flip together.
 */

import { useEffect, useRef, useState } from "react";
import type { PostureLandmarks, PostureStatus } from "@/types";

const SKELETON_EDGES: [keyof PostureLandmarks, keyof PostureLandmarks][] = [
  ["l_ear", "l_shoulder"],
  ["r_ear", "r_shoulder"],
  ["l_shoulder", "r_shoulder"],
  ["l_shoulder", "l_hip"],
  ["r_shoulder", "r_hip"],
  ["l_hip", "r_hip"],
];

// Matches tailwind.config.ts: `sage.deep` (calm/success) and `coral.DEFAULT`
// (the palette's one color reserved for nudges/alerts).
const GOOD_COLOR = "#3F7A5D";
const SLOUCH_COLOR = "#F0665A";

interface CoverRect {
  offsetX: number;
  offsetY: number;
  scale: number;
  containerWidth: number;
  containerHeight: number;
}

interface Props {
  videoRef: React.RefObject<HTMLVideoElement>;
  landmarks: PostureLandmarks | null;
  status: PostureStatus;
  /** Only draw once the session is locked in, calibrated, and the backend
   * currently sees a body — callers already track all of this in
   * sessionStore, so this is just a passthrough gate. */
  visible: boolean;
}

export function PostureSkeletonOverlay({ videoRef, landmarks, status, visible }: Props) {
  const [rect, setRect] = useState<CoverRect | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const recompute = () => {
      const containerWidth = video.clientWidth;
      const containerHeight = video.clientHeight;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      if (!containerWidth || !containerHeight || !videoWidth || !videoHeight) return;

      // Reproduces CSS object-fit: cover — scale up until the video fully
      // covers the container on both axes, then center it.
      const scale = Math.max(containerWidth / videoWidth, containerHeight / videoHeight);
      const renderedWidth = videoWidth * scale;
      const renderedHeight = videoHeight * scale;

      setRect({
        offsetX: (containerWidth - renderedWidth) / 2,
        offsetY: (containerHeight - renderedHeight) / 2,
        scale,
        containerWidth,
        containerHeight,
      });
    };

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(video);
    video.addEventListener("loadedmetadata", recompute);
    return () => {
      observer.disconnect();
      video.removeEventListener("loadedmetadata", recompute);
    };
  }, [videoRef]);

  if (!visible || !landmarks || !rect) return null;

  const video = videoRef.current;
  if (!video || !video.videoWidth || !video.videoHeight) return null;

  const color = status === "slouching" ? SLOUCH_COLOR : GOOD_COLOR;

  const toPx = (point: [number, number]): [number, number] => [
    rect.offsetX + point[0] * video.videoWidth * rect.scale,
    rect.offsetY + point[1] * video.videoHeight * rect.scale,
  ];

  const edges = SKELETON_EDGES.filter(([a, b]) => landmarks[a] && landmarks[b]);
  const points = Object.entries(landmarks) as [keyof PostureLandmarks, [number, number]][];

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1]"
      viewBox={`0 0 ${rect.containerWidth} ${rect.containerHeight}`}
      aria-hidden
    >
      {edges.map(([a, b]) => {
        const [x1, y1] = toPx(landmarks[a]!);
        const [x2, y2] = toPx(landmarks[b]!);
        return (
          <line
            key={`${a}-${b}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            style={{ transition: "stroke 200ms ease" }}
            opacity={0.9}
          />
        );
      })}
      {points.map(([name, point]) => {
        const [x, y] = toPx(point);
        return (
          <circle
            key={name}
            cx={x}
            cy={y}
            r={5}
            fill={color}
            stroke="white"
            strokeWidth={1.5}
            style={{ transition: "fill 200ms ease" }}
          />
        );
      })}
    </svg>
  );
}