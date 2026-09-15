import Link from "next/link";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Row {
  inst_code: string;
  name: string;
  district: string;
  district_code: string;
  type_code: string;
  fee: number | null;
  branches: string[];
}

export default async function Colleges({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const branch = ((sp.branch as string | undefined) ?? "").trim().toUpperCase();
  const district = (sp.district as string | undefined) ?? "";
  const maxFee = Number((sp.maxfee as string | undefined) ?? 0) || 0;
  const search = ((sp.q as string | undefined) ?? "").trim();
  // Escape LIKE wildcards so a literal "%" or "_" can't widen the match.
  const searchEscaped = search.replace(/[\\%_]/g, (m) => "\\" + m);

  let rows: Row[] = [];
  let dbError: string | null = null;
  try {
    rows = await q<Row>(
      `SELECT i.inst_code, i.name, i.district, i.district_code, i.type_code,
              f.tuition_per_year AS fee,
              array_agg(DISTINCT c.branch_code ORDER BY c.branch_code) AS branches
       FROM institutions i
       JOIN cutoffs c ON c.inst_code = i.inst_code
       LEFT JOIN fees f ON f.inst_code = i.inst_code AND f.academic_year = '2025-26'
       WHERE ($1 = '' OR i.name ILIKE '%' || $1 || '%' ESCAPE '\\')
         AND ($2 = '' OR i.district_code = $2)
         AND ($3 = 0 OR f.tuition_per_year IS NULL OR f.tuition_per_year <= $3)
         AND ($4 = '' OR EXISTS (
           SELECT 1 FROM cutoffs c2 WHERE c2.inst_code = i.inst_code AND c2.branch_code = $4
         ))
       GROUP BY i.inst_code, i.name, i.district, i.district_code, i.type_code, f.tuition_per_year
       ORDER BY i.name LIMIT 300`,
      [searchEscaped, district, maxFee, branch]
    );
  } catch (e) {
    console.error("colleges query failed", e);
    dbError = "The verified database is unreachable right now. Start Postgres and reload.";
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Verified colleges</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Every row traces to an official document: APSCHE last-rank details, G.O.Ms.No.118 fee
        order, NBA/NAAC records. Absence of a value means not verified - never &quot;bad&quot;.
      </p>

      <form className="mt-6 flex flex-wrap items-center gap-2" action="/colleges">
        <input
          name="q"
          defaultValue={search}
          placeholder="Search college name"
          className="w-56 rounded-xl border border-line bg-card px-3.5 py-2 text-sm outline-none focus:border-accent"
        />
        <select name="district" defaultValue={district} className="rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent">
          <option value="">All districts</option>
          {["EG","WG","KRI","GTR","PKS","NLR","VSP","VZM","SKL","ATP","KNL","CTR","KDP"].map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <input
          name="maxfee"
          type="number"
          defaultValue={maxFee || ""}
          placeholder="Max fee (all-inclusive)"
          className="w-44 rounded-xl border border-line bg-card px-3.5 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          name="branch"
          defaultValue={branch}
          placeholder="Branch (e.g. CSE)"
          className="w-36 rounded-xl border border-line bg-card px-3.5 py-2 text-sm uppercase outline-none focus:border-accent"
        />
        <button className="btn btn-primary text-[13px]">Filter</button>
        <Link href="/colleges" className="text-[13px] text-muted underline hover:text-accent">reset</Link>
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-card">
        {dbError ? (
          <div className="px-6 py-10 text-center text-[13px] text-contradicted">{dbError}</div>
        ) : (
        <div className="divide-y divide-line">
          {rows.map((r) => (
            <Link
              key={r.inst_code}
              href={"/colleges/" + r.inst_code}
              className="flex flex-col gap-1 px-6 py-4 hover:bg-paper md:flex-row md:items-center md:justify-between md:gap-6"
            >
              <div className="min-w-0">
                <div className="truncate text-[14px] font-medium">{r.name}</div>
                <div className="text-[12px] text-muted">
                  {r.inst_code} · {r.district} · {(r.type_code ?? "").toLowerCase()}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden flex-wrap gap-1 md:flex">
                  {(r.branches ?? []).slice(0, 6).map((b) => (
                    <span key={b} className="chip">{b}</span>
                  ))}
                </div>
                <span className="num text-[13px] font-medium">
                  {r.fee ? "₹" + r.fee.toLocaleString("en-IN") : "fee not verified"}
                </span>
              </div>
            </Link>
          ))}
          {rows.length === 0 && (
            <div className="px-6 py-10 text-center text-[13px] text-muted">
              No colleges match those filters.
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
