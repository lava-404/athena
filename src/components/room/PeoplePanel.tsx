"use client";

import { X } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";

interface PeoplePanelProps {
  onClose: () => void;
}

export function PeoplePanel({ onClose }: PeoplePanelProps) {
  const { user } = usePrivy();
  const label = user?.email?.address ?? user?.google?.email ?? "You";

  return (
    <div className="flex h-full flex-col rounded-2xl bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
        <h2 className="font-display text-sm font-semibold text-ink">People (1)</h2>
        <button onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-soft text-sm font-medium text-amber-deep">
            {label.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p className="text-sm font-medium text-ink">{label}</p>
            <p className="text-xs text-ink-soft">You · host</p>
          </div>
        </div>
      </div>

      <div className="border-t border-ink/10 p-3 text-xs text-ink-soft">
        Share this room's link to invite others — multi-participant video
        joins the call directly, no Buddy analysis is ever shown to them.
      </div>
    </div>
  );
}
