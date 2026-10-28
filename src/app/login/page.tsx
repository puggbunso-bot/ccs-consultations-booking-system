import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/auth";
import { loginAction } from "@/lib/actions";
import Logo from "@/components/Logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const user = await getSession();
  if (user) redirect(homeFor(user.role));

  const { error, ok } = await searchParams;

  return (
    <div className="auth-wrap">
      <div className="auth-brand">
        <Logo size={64} />
        <h1>CCS Faculty Consultation Schedule</h1>
        <p>College of Computer Studies</p>
      </div>

      <div className="card auth-card">
        <h2>Sign in</h2>

        {error && <div className="alert alert-error">{error}</div>}
        {ok && <div className="alert alert-ok">{ok}</div>}

        <form action={loginAction} className="form-grid">
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@ccs.edu.ph"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="btn btn-block btn-lg">
            Sign in
          </button>
        </form>

        <p className="auth-alt">
          New student? <Link href="/register">Create an account</Link>
        </p>
      </div>

      <p className="auth-foot">
        Don&apos;t have an account? Students can register — faculty &amp; admin
        accounts are created by the administrator.
      </p>
    </div>
  );
}
