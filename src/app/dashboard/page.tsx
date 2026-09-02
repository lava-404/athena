"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import { fetchSessions, fetchSessionStats } from "@/lib/api/backend";
import type { SessionRecord, SessionStats } from "@/types";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { SessionList } from "@/components/dashboard/SessionList";
import { UserMenu } from "@/components/auth/AuthControls";

export default function DashboardPage() {
  const { ready, authenticated } = useRequireAuth();
  const { getAccessToken } = usePrivy();

  const [sessions, setSessions] = useState<SessionRecord[] | null>(null);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const [sessionData, statsData] = await Promise.all([
        fetchSessions(token),
        fetchSessionStats(token),
      ]);
      setSessions(sessionData);
      setStats(statsData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't reach the AI backend. Is it running?"
      );
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (authenticated) load();
  }, [authenticated, load]);

  if (!ready || !authenticated) {
    return <div className="flex min-h-screen items-center justify-center bg-paper" />;
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-ink-soft transition hover:text-ink">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="font-display text-lg font-semibold text-ink">Your sessions</h1>
            <p className="text-xs text-ink-soft">History and focus trends, all in one place</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-soft shadow-soft transition hover:text-ink disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {error && (
          <div className="rounded-2xl bg-coral-soft px-4 py-3 text-sm text-coral">{error}</div>
        )}

        {stats && <StatsCards stats={stats} />}
        {sessions && sessions.length > 0 && <TrendChart sessions={sessions} />}
        {sessions && (
          <div>
            <h2 className="mb-3 font-display text-sm font-semibold text-ink">All sessions</h2>
            <SessionList sessions={sessions} />
          </div>
        )}

        {!sessions && !error && (
          <p className="text-sm text-ink-soft">Loading your session history…</p>
        )}
      </main>
    </div>
  );
}
