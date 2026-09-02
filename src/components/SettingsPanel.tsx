"use client";

import { X } from "lucide-react";
import clsx from "clsx";
import { useSessionStore } from "@/lib/store/sessionStore";
import type { NudgeSensitivity } from "@/types";

const SENSITIVITY_OPTIONS: { value: NudgeSensitivity; label: string; hint: string }[] = [
  { value: "gentle", label: "Gentle", hint: "Only speaks up after a long slump" },
  { value: "normal", label: "Normal", hint: "Balanced, the default" },
  { value: "strict", label: "Strict", hint: "Speaks up sooner and more often" },
];

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const settings = useSessionStore((s) => s.settings);
  const pauseBuddy = useSessionStore((s) => s.pauseBuddy);
  const resumeBuddy = useSessionStore((s) => s.resumeBuddy);
  const setSensitivity = useSessionStore((s) => s.setSensitivity);
  const toggleVoice = useSessionStore((s) => s.toggleVoice);

  return (
    <div className="flex h-full flex-col rounded-2xl bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
        <h2 className="font-display text-sm font-semibold text-ink">Buddy settings</h2>
        <button onClick={onClose} aria-label="Close settings" className="text-ink-soft hover:text-ink">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <section>
          <p className="mb-2 text-sm font-medium text-ink">Buddy</p>
          <button
            onClick={settings.paused ? resumeBuddy : pauseBuddy}
            className={clsx(
              "w-full rounded-xl px-4 py-2 text-sm font-medium transition",
              settings.paused
                ? "bg-sage-soft text-sage-deep hover:bg-sage-soft/70"
                : "bg-coral-soft text-coral hover:bg-coral-soft/70"
            )}
          >
            {settings.paused ? "Resume Buddy" : "Pause Buddy for a while"}
          </button>
          <p className="mt-1.5 text-xs text-ink-soft">
            Pausing stops all posture reading and nudges immediately — nothing
            is analyzed while paused.
          </p>
        </section>

        <section>
          <p className="mb-2 text-sm font-medium text-ink">Nudge sensitivity</p>
          <div className="space-y-2">
            {SENSITIVITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSensitivity(opt.value)}
                className={clsx(
                  "w-full rounded-xl border px-4 py-2 text-left text-sm transition",
                  settings.sensitivity === opt.value
                    ? "border-amber bg-amber-soft/50 text-ink"
                    : "border-ink/10 text-ink-soft hover:border-ink/20"
                )}
              >
                <span className="font-medium text-ink">{opt.label}</span>
                <span className="block text-xs text-ink-soft">{opt.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">Buddy voice lines</p>
              <p className="text-xs text-ink-soft">Soft optional audio for nudges</p>
            </div>
            <button
              role="switch"
              aria-checked={settings.voiceEnabled}
              onClick={toggleVoice}
              className={clsx(
                "relative h-6 w-11 rounded-full transition",
                settings.voiceEnabled ? "bg-amber" : "bg-ink/15"
              )}
            >
              <span
                className={clsx(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
                  settings.voiceEnabled ? "left-5" : "left-0.5"
                )}
              />
            </button>
          </div>
        </section>

        <section className="rounded-xl bg-paper p-3 text-xs text-ink-soft">
          Posture and focus analysis runs on a dedicated AI backend you (or
          your organization) control, over a private connection — frames are
          analyzed for scores and immediately discarded, never stored.
          Pausing Buddy stops the video stream to that backend entirely.
        </section>
      </div>
    </div>
  );
}
