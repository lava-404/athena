"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Buddy } from "@/components/Buddy/Buddy";
import { LoginButton, UserMenu } from "@/components/auth/AuthControls";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

function generateRoomId(): string {
  const words = ["cedar", "quiet", "amber", "drift", "coral", "ember", "sage", "linen"];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${w}-${n}`;
}

export default function Home() {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const [joinCode, setJoinCode] = useState("");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-paper px-6 py-16">
      <div className="absolute right-6 top-6">
        {ready && (authenticated ? (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm text-ink-soft shadow-soft transition hover:text-ink"
            >
              <LayoutDashboard size={15} /> Dashboard
            </Link>
            <UserMenu />
          </div>
        ) : (
          <LoginButton />
        ))}
      </div>

      <div className="flex flex-col items-center gap-6 text-center">
        <Buddy state="idle" size={140} />
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
            FocusRoom
          </h1>
          <p className="mx-auto mt-3 max-w-md text-ink-soft">
            A calm video room with a companion who stays present with you —
            reads your posture and focus through a private AI backend, and is
            the only one who can call a break.
          </p>
        </div>
      </div>

      {!ready ? (
        <div className="h-24" />
      ) : !authenticated ? (
        <div className="flex flex-col items-center gap-3">
          <LoginButton />
          <p className="text-xs text-ink-soft">
            Log in to create or join a room — your session history is tied to your account.
          </p>
        </div>
      ) : (
        <div className="flex w-full max-w-sm flex-col gap-3">
          <button
            onClick={() => router.push(`/room/${generateRoomId()}`)}
            className="rounded-full bg-amber px-6 py-3 font-medium text-white shadow-soft transition hover:bg-amber-deep"
          >
            Create a new room
          </button>

          <div className="flex items-center gap-3 text-xs text-ink-soft">
            <span className="h-px flex-1 bg-ink/10" />
            or join one
            <span className="h-px flex-1 bg-ink/10" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (joinCode.trim()) router.push(`/room/${joinCode.trim()}`);
            }}
            className="flex gap-2"
          >
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Enter room code"
              className="flex-1 rounded-full bg-white px-4 py-2.5 text-sm text-ink shadow-soft outline-none ring-1 ring-inset ring-ink/10 focus:ring-amber"
            />
            <button
              type="submit"
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-ink/90"
            >
              Join
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
