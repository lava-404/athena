"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { LayoutDashboard, LogOut, User } from "lucide-react";
import Link from "next/link";

export function LoginButton() {
  const { ready, login } = usePrivy();
  return (
    <button
      onClick={login}
      disabled={!ready}
      className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-ink/90 disabled:opacity-50"
    >
      Log in or sign up
    </button>
  );
}

export function UserMenu() {
  const { user, logout } = usePrivy();
  const [open, setOpen] = useState(false);

  const label =
    user?.email?.address ?? user?.google?.email ?? user?.id.slice(0, 10) ?? "Account";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-ink shadow-soft transition hover:bg-paper"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-soft text-amber-deep">
          <User size={14} />
        </span>
        <span className="max-w-[140px] truncate">{label}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-10 mt-2 w-48 overflow-hidden rounded-xl bg-white py-1 shadow-soft"
          onMouseLeave={() => setOpen(false)}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-paper"
          >
            <LayoutDashboard size={16} /> Dashboard
          </Link>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-coral hover:bg-coral-soft/40"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
