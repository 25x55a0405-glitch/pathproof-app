import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-muted">
        That college code or page does not exist in the AP EAPCET 2025 pool.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link href="/colleges" className="btn btn-primary text-[13px]">
          Browse verified colleges
        </Link>
        <Link href="/" className="btn btn-ghost text-[13px]">
          Back home
        </Link>
      </div>
    </div>
  );
}
