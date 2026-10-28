"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDate, formatRange, weekdayOf } from "@/lib/format";

export interface ScheduleSlot {
  id: number;
  date: string; // 'YYYY-MM-DD'
  start_time: string; // "09:00"
  end_time: string; // "11:00"
  room: string | null;
}

interface Props {
  slots: ScheduleSlot[];
  fallbackRoom: string | null;
  canBook: boolean;
}

/**
 * Student view of a teacher's schedule.
 *
 * The dropdown lists ONLY the exact dates the faculty set. Picking one shows
 * the time window(s) and room for THAT date — nothing else is invented.
 */
export default function ScheduleByDate({ slots, fallbackRoom, canBook }: Props) {
  // Unique dates, earliest first.
  const dates = useMemo(
    () => [...new Set(slots.map((s) => s.date))].sort((a, b) => a.localeCompare(b)),
    [slots],
  );

  const [date, setDate] = useState(dates[0] ?? "");

  if (dates.length === 0) {
    return <p className="empty">This teacher has not set their availability yet.</p>;
  }

  const active = date || dates[0];
  const forDate = slots
    .filter((s) => s.date === active)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div>
      <div className="date-select">
        <label htmlFor="sched-date">Choose a date</label>
        <select id="sched-date" value={active} onChange={(e) => setDate(e.target.value)}>
          {dates.map((d) => (
            <option key={d} value={d}>
              {formatDate(d)} · {weekdayOf(d)}
            </option>
          ))}
        </select>
        <p className="form-hint">
          Only the dates your professor set as available appear here.
        </p>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Time</th>
              <th>Location</th>
              {canBook && <th className="right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {forDate.map((s) => (
              <tr key={s.id}>
                <td className="sched-day">{weekdayOf(s.date)}</td>
                <td className="sched-time">{formatRange(s.start_time, s.end_time)}</td>
                <td>{s.room ?? fallbackRoom ?? "—"}</td>
                {canBook && (
                  <td>
                    <div className="actions">
                      <Link href={`/book/${s.id}`} className="btn btn-small">
                        Book →
                      </Link>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
