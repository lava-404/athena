"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SessionRecord } from "@/types";

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function TrendChart({ sessions }: { sessions: SessionRecord[] }) {
  // Oldest -> newest, left to right, matches how you'd read a timeline.
  const data = [...sessions]
    .reverse()
    .map((s) => ({
      date: shortDate(s.started_at),
      posture: s.posture_nudge_count,
      focus: s.focus_nudge_count,
      breaks: s.break_reminder_count,
      minutes: Math.round(s.duration_seconds / 60),
    }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl bg-white p-4 shadow-soft">
        <h3 className="mb-3 font-display text-sm font-semibold text-ink">
          Session length over time
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#18262015" />
            <XAxis dataKey="date" fontSize={12} stroke="#3C5148" />
            <YAxis fontSize={12} stroke="#3C5148" unit="m" />
            <Tooltip />
            <Line type="monotone" dataKey="minutes" stroke="#C97F2F" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-soft">
        <h3 className="mb-3 font-display text-sm font-semibold text-ink">
          Nudges per session
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#18262015" />
            <XAxis dataKey="date" fontSize={12} stroke="#3C5148" />
            <YAxis fontSize={12} stroke="#3C5148" allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="posture" name="Posture" fill="#F2A65A" radius={[4, 4, 0, 0]} />
            <Bar dataKey="focus" name="Focus" fill="#F0665A" radius={[4, 4, 0, 0]} />
            <Bar dataKey="breaks" name="Break reminders" fill="#6FA989" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
