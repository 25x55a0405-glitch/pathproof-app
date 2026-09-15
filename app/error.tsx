"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("route error", error);
  }, [error]);

  const dbDown = /DB_UNAVAILABLE|ECONNREFUSED|connect/i.test(error.message);

  return (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {dbDown ? "Database unreachable" : "Something went wrong"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {dbDown
          ? "PathProof could not reach Postgres. Start the database (docker compose up -d db or sudo service postgresql start), verify DATABASE_URL in .env.local, then reload."
          : "An unexpected error occurred. Try again — if it persists, contact grievance@pathproof.in."}
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button onClick={reset} className="btn btn-primary text-[13px]">
          Try again
        </button>
        <Link href="/" className="btn btn-ghost text-[13px]">
          Back home
        </Link>
      </div>
    </div>
  );
}
