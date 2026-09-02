"use client";

import { useState } from "react";
import { Send, X } from "lucide-react";
import { useSessionStore } from "@/lib/store/sessionStore";

interface ChatPanelProps {
  onClose: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const chat = useSessionStore((s) => s.chat);
  const addChatMessage = useSessionStore((s) => s.addChatMessage);
  const [draft, setDraft] = useState("");

  const send = () => {
    if (!draft.trim()) return;
    addChatMessage({ author: "You", text: draft.trim() });
    setDraft("");
  };

  return (
    <div className="flex h-full flex-col rounded-2xl bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
        <h2 className="font-display text-sm font-semibold text-ink">In-call messages</h2>
        <button onClick={onClose} aria-label="Close chat" className="text-ink-soft hover:text-ink">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {chat.length === 0 && (
          <p className="text-sm text-ink-soft">
            Messages here are only visible to people in this call.
          </p>
        )}
        {chat.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="font-medium text-ink">{m.author}</span>
            <span className="ml-2 text-ink-soft">
              {new Date(m.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <p className="text-ink">{m.text}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-ink/10 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Send a message"
          className="flex-1 rounded-full bg-paper px-4 py-2 text-sm outline-none ring-1 ring-inset ring-ink/10 focus:ring-amber"
        />
        <button
          onClick={send}
          aria-label="Send"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-amber text-white hover:bg-amber-deep"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
