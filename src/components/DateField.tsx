"use client";

import { useState } from "react";
import { weekdayOf } from "@/lib/format";

/**
 * A date picker that shows WHICH DAY it is, live.
 * The faculty picks an exact date; the weekday is derived so the two can
 * never disagree.
 */
export default function DateField({ defaultValue }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const day = value ? weekdayOf(value) : "";

  return (
    <>
      <label htmlFor="date">Date</label>
      <input
        id="date"
        name="date"
        type="date"
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <p className="form-hint">{day ? `${day}s` : "Pick the exact date you are free"}</p>
    </>
  );
}
