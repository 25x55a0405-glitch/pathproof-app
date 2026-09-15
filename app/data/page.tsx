import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Source {
  id: number;
  name: string;
  url: string | null;
  publisher: string;
  doc_type: string;
  retrieved_date: string;
  notes: string | null;
}

export default async function DataSources() {
  let sources: Source[] = [];
  try {
    sources = await q<Source>(
      `SELECT id, name, url, publisher, doc_type, retrieved_date::text AS retrieved_date, notes
       FROM sources ORDER BY id`
    );
  } catch (e) {
    console.error("sources query failed", e);
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center">
        <h1 className="text-2xl font-semibold">Data sources unavailable</h1>
        <p className="mt-2 text-sm text-muted">The verified database is unreachable right now. Start Postgres and reload.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      <h1 className="text-4xl font-semibold tracking-tight">Every fact has a paper trail</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        These are the only sources behind the data. Each one is official, with its retrieval date
        stored next to every value it produced.
      </p>

      <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-card">
        {sources.map((s) => (
          <a
            key={s.id}
            href={s.url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-6 py-4 hover:bg-paper"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{s.name}</span>
              <span className="num text-[12px] text-muted">{s.retrieved_date}</span>
            </div>
            <div className="text-[12px] text-muted">{s.publisher} · {s.notes}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
