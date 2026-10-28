"use client";

import { useMemo, useState } from "react";
import { createBookingAction } from "@/lib/booking-actions";
import { formatRange, formatDate, formatTime, weekdayOf } from "@/lib/format";
import type { Day } from "@/lib/types";

type BookedSlot = { date: string; start_time: string; end_time: string };

interface Props {
  availabilityId: number;
  facultyName: string;
  day: Day;
  /** The exact date the faculty set — the ONLY date bookable here. */
  date: string;
  windowStart: string; // "07:00"
  windowEnd: string; // "12:00"
  room: string | null;
  /** Every pending/approved booking for this faculty (future dates). */
  booked: BookedSlot[];
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

/** "90" → "1 hr 30 min", "180" → "3 hrs", "30" → "30 min" */
function durationLabel(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hr = `${h} ${h === 1 ? "hr" : "hrs"}`;
  return m === 0 ? hr : `${hr} ${m} min`;
}

export default function BookingForm({
  availabilityId,
  facultyName,
  day,
  date,
  windowStart,
  windowEnd,
  room,
  booked,
}: Props) {
  // The faculty set ONE exact date — students book only that date.
  const winStart = toMin(windowStart);
  const winEnd = toMin(windowEnd);

  /** Every legal start time: 30-min steps, always leaving room for 30 min. */
  const startTimes = useMemo(() => {
    const out: string[] = [];
    for (let t = winStart; t + 30 <= winEnd; t += 30) out.push(toHHMM(t));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowStart, windowEnd]);

  /** Every legal duration: 30-min steps up to the whole window. */
  const durations = useMemo(() => {
    const out: number[] = [];
    for (let d = 30; winStart + d <= winEnd; d += 30) out.push(d);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowStart, windowEnd]);

  const [start, setStart] = useState("");
  const [duration, setDuration] = useState(0);
  const [note, setNote] = useState("");

  /** Does [s, e) overlap an active booking on the chosen date? */
  const overlaps = (s: number, e: number) =>
    booked.some((b) => {
      if (b.date !== date) return false;
      const s2 = toMin(b.start_time);
      const e2 = toMin(b.end_time);
      return s < e2 && e > s2;
    });

  /** Durations that fit the window AND do not hit a booked slot. */
  const fitsAt = (startMin: number) =>
    durations.filter((d) => startMin + d <= winEnd && !overlaps(startMin, startMin + d));

  const chosenStart = start ? toMin(start) : -1;
  const availableDurations = chosenStart >= 0 ? fitsAt(chosenStart) : [];
  const freeStarts = startTimes.filter((t) => fitsAt(toMin(t)).length > 0);
  const allTaken = freeStarts.length === 0;

  // Keep the picked duration valid when date/start/window changes.
  const validDuration = availableDurations.includes(duration) ? duration : 0;
  const endMin = chosenStart >= 0 && validDuration > 0 ? chosenStart + validDuration : -1;

  return (
    <form action={createBookingAction} className="form-grid">
      <input type="hidden" name="availability_id" value={availabilityId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="start_time" value={endMin > 0 ? start : ""} />
      <input type="hidden" name="end_time" value={endMin > 0 ? toHHMM(endMin) : ""} />

      <div>
        <label htmlFor="date">1. Date</label>
        <p className="date-fixed">
          {formatDate(date)} · {weekdayOf(date)}
        </p>
        <p className="form-hint">
          The only {day} date {facultyName} set as available for this slot.
        </p>
      </div>

      <div>
        <label>2. Pick a start time</label>
        {allTaken ? (
          <p className="empty" style={{ padding: "0.8rem 0" }}>
            This date is already fully booked. Please choose another date.
          </p>
        ) : (
          <div className="slot-grid">
            {startTimes.map((t) => {
              const free = fitsAt(toMin(t)).length > 0;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={!free}
                  onClick={() => {
                    setStart(t);
                    setDuration(0);
                  }}
                  className={`slot ${start === t ? "active" : ""} ${free ? "" : "taken"}`}
                  title={free ? "Available" : "Already booked"}
                >
                  <span>{formatTime(t)}</span>
                  {!free && <small>Booked</small>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <label>3. How long? (up to the whole {formatRange(windowStart, windowEnd)} window)</label>
        {!start ? (
          <p className="muted small" style={{ margin: "0.4rem 0" }}>
            Pick a start time first.
          </p>
        ) : availableDurations.length === 0 ? (
          <p className="empty" style={{ padding: "0.6rem 0" }}>
            No duration fits after {formatTime(start)} — the rest of this day is booked.
          </p>
        ) : (
          <div className="slot-grid">
            {durations.map((d) => {
              const fits = availableDurations.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  disabled={!fits}
                  onClick={() => setDuration(d)}
                  className={`slot ${validDuration === d ? "active" : ""} ${fits ? "" : "taken"}`}
                  title={fits ? "Available" : "Not available"}
                >
                  <span>{durationLabel(d)}</span>
                  {!fits && <small>Unavailable</small>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="note">4. Reason for consultation (optional)</label>
        <textarea
          id="note"
          name="note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Clarify the requirements for the final project"
        />
      </div>

      <div className="booking-summary">
        <div>
          <span className="muted small">Faculty</span>
          <strong>{facultyName}</strong>
        </div>
        <div>
          <span className="muted small">When</span>
          <strong>
            {date ? formatDate(date) : "—"} ·{" "}
            {endMin > 0 ? formatRange(start, toHHMM(endMin)) : "select a start time"}
            {validDuration > 0 && (
              <span className="muted small"> ({durationLabel(validDuration)})</span>
            )}
          </strong>
        </div>
        <div>
          <span className="muted small">Where</span>
          <strong>{room ?? "TBA"}</strong>
        </div>
      </div>

      <button type="submit" className="btn btn-block btn-lg" disabled={endMin <= 0}>
        {endMin > 0 ? "Request booking →" : "Pick a start time first"}
      </button>

      <p className="muted small" style={{ textAlign: "center", margin: 0 }}>
        ⏳ Your booking stays <strong>pending</strong> until {facultyName} approves it.
        {!allTaken && freeStarts.length < startTimes.length &&
          ` ${startTimes.length - freeStarts.length} start time(s) on this date are already booked.`}
      </p>
    </form>
  );
}
