import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "CCS Faculty Consultation Schedule",
  description:
    "See when CCS faculty are available — set and view consultation schedules.",
};

// Every route in this app reads the session cookie (Nav + auth guards),
// so each render is per-request — opt the whole tree out of static-shell
// validation (see: route segment config `instant`).
export const instant = false;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
