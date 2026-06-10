"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { adminApi, type LiveClassAttendanceDto } from "@/lib/api";

export function LiveClassAttendancePanel({
  liveClassId,
  state,
}: {
  liveClassId: string;
  state: string;
}) {
  const [attendance, setAttendance] = useState<LiveClassAttendanceDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state !== "Live" && state !== "Ended") {
      setAttendance(null);
      return;
    }
    setLoading(true);
    adminApi
      .liveClassAttendance(liveClassId)
      .then(setAttendance)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load attendance"))
      .finally(() => setLoading(false));
  }, [liveClassId, state]);

  if (state !== "Live" && state !== "Ended") return null;

  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
        <Users className="h-3.5 w-3.5" /> Attendance
      </p>
      {loading ? (
        <p className="mt-2 text-xs text-slate-500">Loading…</p>
      ) : error ? (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      ) : attendance ? (
        <div className="mt-2">
          <p className="text-sm text-slate-700">
            <span className="font-medium">{attendance.totalJoined}</span> student
            {attendance.totalJoined === 1 ? "" : "s"} joined
          </p>
          {attendance.attendees.length > 0 && (
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-slate-600">
              {attendance.attendees.map((a) => (
                <li key={a.userId}>
                  {a.userName} · {new Date(a.joinedAtUtc).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
