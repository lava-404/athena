"use client";

import { AnimatePresence, motion } from "framer-motion";

interface SpeechBubbleProps {
  text: string | null;
}

// The Buddy's ONLY channel for feedback is this bubble — deliberately not a
// system toast or modal, so nudges read as "someone speaking to you" rather
// than "the app flagging you". See product requirement: nudges are private,
// gentle, and character-driven.
export function SpeechBubble({ text }: SpeechBubbleProps) {
  return (
    <AnimatePresence mode="wait">
      {text && (
        <motion.div
          key={text}
          initial={{ opacity: 0, y: 8, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="relative max-w-[220px] rounded-2xl bg-white px-4 py-3 text-sm leading-snug text-ink shadow-soft"
        >
          {text}
          <span
            aria-hidden
            className="absolute -bottom-[6px] left-9 h-3 w-3 rotate-45 bg-white"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
