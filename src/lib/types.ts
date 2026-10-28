// Shared types for the CCS Faculty Consultation Scheduling System

export type Role = "admin" | "faculty" | "student";

export type Day =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export const DAYS: Day[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export interface SessionUser {
  id: number;
  email: string;
  role: Role;
  first_name: string;
  last_name: string;
  specialization: string | null;
  room: string | null;
  status: "active" | "inactive" | "pending";
  created_at: string;
}

/** Internal row shape — includes the password hash (never sent to the client). */
export interface UserRow extends SessionUser {
  password_hash: string;
}

export interface AvailabilityRow {
  id: number;
  faculty_id: number;
  day: Day;
  /** Exact consultation date ('YYYY-MM-DD') — always set. */
  date: string;
  start_time: string; // "09:00"
  end_time: string; // "12:00"
  room: string | null;
  created_at: string;
}

/** Availability row joined with its faculty member (for the student/admin views). */
export interface AvailabilityWithFaculty extends AvailabilityRow {
  faculty:
    | Pick<SessionUser, "id" | "first_name" | "last_name" | "role" | "specialization" | "room">
    | null;
}

// ---------------------------------------------------------------------------
// BOOKINGS
// ---------------------------------------------------------------------------

export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface BookingRow {
  id: number;
  student_id: number;
  faculty_id: number;
  availability_id: number;
  date: string; // 'YYYY-MM-DD'
  start_time: string; // '09:00'
  end_time: string; // '10:00'
  note: string | null;
  status: BookingStatus;
  created_at: string;
  decided_at: string | null;
}

/** Booking joined with the student + faculty names (for both sides' lists). */
export interface BookingWithPeople extends BookingRow {
  student: Pick<SessionUser, "id" | "first_name" | "last_name" | "email"> | null;
  faculty:
    | Pick<SessionUser, "id" | "first_name" | "last_name" | "specialization" | "room">
    | null;
  availability: Pick<AvailabilityRow, "id" | "date" | "day" | "room"> | null;
}

// ---------------------------------------------------------------------------
// NOTIFICATIONS (in-app only)
// ---------------------------------------------------------------------------

export type NotificationType =
  | "booking_requested"
  | "booking_approved"
  | "booking_rejected"
  | "booking_cancelled"
  | "new_link";

export interface NotificationRow {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// MESSAGES — chatbox (online link only)
// ---------------------------------------------------------------------------

export interface MessageRow {
  id: number;
  booking_id: number;
  sender_id: number;
  body: string;
  created_at: string;
}

export interface MessageWithSender extends MessageRow {
  sender: Pick<SessionUser, "id" | "first_name" | "last_name" | "role"> | null;
}
