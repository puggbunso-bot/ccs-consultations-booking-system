"use client";

import { useState } from "react";
import { registerAction } from "@/lib/actions";

type Role = "student" | "faculty";

export default function RegisterForm() {
  const [role, setRole] = useState<Role>("student");

  return (
    <form action={registerAction} className="form-grid">
      {/* Role picker */}
      <div className="role-pick" role="radiogroup" aria-label="Account type">
        <label className={`role-opt ${role === "student" ? "active" : ""}`}>
          <input
            type="radio"
            name="role"
            value="student"
            checked={role === "student"}
            onChange={() => setRole("student")}
          />
          <span className="role-emoji">🎓</span>
          <span>
            <strong>Student</strong>
            <small>View faculty schedules</small>
          </span>
        </label>
        <label className={`role-opt ${role === "faculty" ? "active" : ""}`}>
          <input
            type="radio"
            name="role"
            value="faculty"
            checked={role === "faculty"}
            onChange={() => setRole("faculty")}
          />
          <span className="role-emoji">👨‍🏫</span>
          <span>
            <strong>Faculty</strong>
            <small>Set my availability</small>
          </span>
        </label>
      </div>

      <div className="form-row">
        <div>
          <label htmlFor="first_name">First name</label>
          <input id="first_name" name="first_name" autoComplete="given-name" required />
        </div>
        <div>
          <label htmlFor="last_name">Last name</label>
          <input id="last_name" name="last_name" autoComplete="family-name" required />
        </div>
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@ccs.edu.ph"
          autoComplete="email"
          required
        />
      </div>

      <div className="form-row">
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Min. 6 characters"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>
        <div>
          <label htmlFor="confirm">Confirm password</label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            placeholder="Repeat password"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>
      </div>

      {role === "faculty" && (
        <div className="form-row">
          <div>
            <label htmlFor="specialization">Specialization</label>
            <input
              id="specialization"
              name="specialization"
              placeholder="e.g. Artificial Intelligence"
            />
          </div>
          <div>
            <label htmlFor="room">Default room</label>
            <input id="room" name="room" placeholder="Room 305" />
          </div>
        </div>
      )}

      <div className="approval-note">
        ⏳ All new {role === "faculty" ? "faculty" : "student"} accounts need{" "}
        <strong>admin approval</strong> before you can sign in.
      </div>

      <button type="submit" className="btn btn-block btn-lg">
        {role === "student" ? "Register as student" : "Register as faculty"}
      </button>
    </form>
  );
}
