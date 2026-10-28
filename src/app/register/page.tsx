import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/auth";
import Logo from "@/components/Logo";
import RegisterForm from "@/components/RegisterForm";

export default async function RegisterPage({
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
        <h1>Create your account</h1>
        <p>For CCS students and faculty · College of Computer Studies</p>
      </div>

      <div className="card auth-card">
        <h2>Register</h2>

        {error && <div className="alert alert-error">{error}</div>}
        {ok && <div className="alert alert-ok">{ok}</div>}

        <RegisterForm />

        <p className="auth-alt">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>

      <p className="auth-foot">
        Admin-created accounts are approved automatically — self-registered
        accounts wait for administrator approval.
      </p>
    </div>
  );
}
