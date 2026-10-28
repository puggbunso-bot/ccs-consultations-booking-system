import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/auth";
import Logo from "@/components/Logo";

export default async function HomePage() {
  const user = await getSession();
  if (user) redirect(homeFor(user.role));

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="hero">
        <Logo size={72} />
        <h1>Know when your professor is available</h1>
        <p className="lead">
          The consultation schedule board of the{" "}
          <strong>College of Computer Studies (CCS)</strong>.
        </p>
        <div className="hero-cta">
          <Link href="/login" className="btn btn-lg">
            Sign in
          </Link>
          <Link href="/register" className="btn btn-outline btn-lg">
            Register
          </Link>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="how">
        <h2>How it works</h2>
        <div className="how-steps">
          <div className="how-step">
            <span className="step-num">1</span>
            <h3>Register</h3>
            <p>Create your student or faculty account.</p>
          </div>
          <div className="how-step">
            <span className="step-num">2</span>
            <h3>Pick a faculty</h3>
            <p>Choose your professor from the CCS faculty list.</p>
          </div>
          <div className="how-step">
            <span className="step-num">3</span>
            <h3>See the schedule</h3>
            <p>View the days and times they are available.</p>
          </div>
        </div>
        <div className="how-cta">
          <Link href="/register" className="btn btn-lg">
            Get started →
          </Link>
        </div>
      </section>

      <footer className="foot">
        <Logo size={22} />
        <span>
          CCS Faculty Consultation Schedule · College of Computer Studies · © 2026
        </span>
      </footer>
    </>
  );
}
