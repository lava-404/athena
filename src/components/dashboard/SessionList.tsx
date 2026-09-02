import type { SessionRecord } from "@/types";

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function SessionList({ sessions }: { sessions: SessionRecord[] }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink/15 p-8 text-center text-sm text-ink-soft">
        No sessions yet — lock in with Buddy in a room and it'll show up here.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink-soft">
            <th className="px-4 py-3 font-medium">Room</th>
            <th className="px-4 py-3 font-medium">Started</th>
            <th className="px-4 py-3 font-medium">Duration</th>
            <th className="px-4 py-3 font-medium">Posture</th>
            <th className="px-4 py-3 font-medium">Focus</th>
            <th className="px-4 py-3 font-medium">Breaks</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.session_id} className="border-b border-ink/5 last:border-0">
              <td className="px-4 py-3 text-ink">{s.room_id}</td>
              <td className="px-4 py-3 text-ink-soft">
                {new Date(s.started_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="px-4 py-3 text-ink-soft">{formatDuration(s.duration_seconds)}</td>
              <td className="px-4 py-3 text-ink-soft">{s.posture_nudge_count}</td>
              <td className="px-4 py-3 text-ink-soft">{s.focus_nudge_count}</td>
              <td className="px-4 py-3 text-ink-soft">{s.break_reminder_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
