import Logo from "@/components/Logo";

export default function Loading() {
  return (
    <div className="loader-wrap">
      <Logo size={58} />
      <div className="spinner" aria-hidden="true" />
      <p className="muted">Loading…</p>
    </div>
  );
}
