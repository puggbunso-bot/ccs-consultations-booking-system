"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { displayName } from "@/lib/format";
import type { SessionUser } from "@/lib/types";

/**
 * Faculty directory with a live search box.
 * Matches the full name (incl. the "Prof." prefix), specialization and room.
 */
export default function FacultySearch({ faculty }: { faculty: SessionUser[] }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faculty;
    return faculty.filter((f) => {
      const haystack = [
        displayName(f), // "Prof. Juan Cruz"
        f.first_name,
        f.last_name,
        f.specialization ?? "",
        f.room ?? "",
        f.email,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [faculty, query]);

  return (
    <>
      <div className="search-bar">
        <span className="search-icon" aria-hidden="true">
          🔍
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search faculty name or Prof…"
          aria-label="Search faculty"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className="search-clear"
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <p className="search-count muted small" role="status">
        {query
          ? `${results.length} ${results.length === 1 ? "result" : "results"} for “${query}”`
          : `${faculty.length} faculty member${faculty.length === 1 ? "" : "s"}`}
      </p>

      {faculty.length === 0 ? (
        <div className="card">
          <p className="empty">No active faculty found.</p>
        </div>
      ) : results.length === 0 ? (
        <div className="card">
          <p className="empty">
            No faculty matches “{query}”. Try a different name or specialization.
          </p>
        </div>
      ) : (
        <div className="card-grid">
          {results.map((f) => (
            <div key={f.id} className="faculty-card">
              <div className="profile-head" style={{ marginBottom: 0 }}>
                <div className="avatar">{f.first_name[0]}</div>
                <div>
                  <h2>{displayName(f)}</h2>
                  <p className="spec">{f.specialization ?? "CCS Faculty"}</p>
                </div>
              </div>
              <div className="meta">📍 {f.room ?? "TBA"}</div>
              <Link href={`/browse/${f.id}`} className="btn btn-small">
                View schedule →
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
