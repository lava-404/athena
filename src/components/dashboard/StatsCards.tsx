import type { SessionStats } from "@/types";

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function StatsCards({ stats }: { stats: SessionStats }) {
  const cards = [
    { label: "Sessions", value: stats.total_sessions.toString() },
    { label: "Total focused time", value: formatDuration(stats.total_focused_seconds) },
    { label: "Avg. posture nudges", value: stats.avg_posture_nudges_per_session.toString() },
    { label: "Avg. focus nudges", value: stats.avg_focus_nudges_per_session.toString() },
    { label: "Avg. break reminders", value: stats.avg_break_reminders_per_session.toString() },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl bg-white p-4 shadow-soft">
          <p className="font-display text-2xl font-semibold text-ink">{c.value}</p>
          <p className="mt-1 text-xs text-ink-soft">{c.label}</p>
        </div>
      ))}
    </div>
  );
}
