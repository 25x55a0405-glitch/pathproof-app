import Link from "next/link";
import { notFound } from "next/navigation";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Inst {
  inst_code: string;
  name: string;
  type_code: string | null;
  type: string | null;
  district: string | null;
  district_code: string | null;
  region: string | null;
  fee: number | null;
}

interface Cutoff {
  branch_code: string;
  category: string;
  gender: string;
  local_area: string;
  closing_rank: number;
}

interface Accr {
  agency: string;
  branch_code: string | null;
  status: string;
  detail: string | null;
  valid_from: string | null;
  valid_to: string | null;
}

export default async function CollegePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = rawCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,8}$/.test(code)) notFound();
  let instRows: Inst[] = [];
  let cutoffs: Cutoff[] = [];
  let accrs: Accr[] = [];
  try {
    instRows = await q<Inst>(
      `SELECT i.inst_code, i.name, i.type_code, i.type, i.district, i.district_code, i.region,
              f.tuition_per_year AS fee
       FROM institutions i
       LEFT JOIN fees f ON f.inst_code = i.inst_code AND f.academic_year = '2025-26'
       WHERE i.inst_code = $1`,
      [code]
    );
  } catch (e) {
    console.error("college query failed", e);
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center">
        <p className="text-sm text-contradicted">The verified database is unreachable right now. Start Postgres and reload.</p>
        <Link href="/colleges" className="btn btn-ghost mt-5">Back to colleges</Link>
      </div>
    );
  }
  const inst = instRows[0];
  if (!inst) notFound();

  try {
    cutoffs = await q<Cutoff>(
      `SELECT branch_code, category, gender, local_area, closing_rank
       FROM cutoffs WHERE inst_code = $1
       ORDER BY branch_code, category, gender, local_area`,
      [code]
    );
    accrs = await q<Accr>(
      `SELECT agency, branch_code, status, detail,
              valid_from::text AS valid_from, valid_to::text AS valid_to
       FROM accreditations WHERE inst_code = $1
       ORDER BY agency, branch_code NULLS FIRST`,
      [code]
    );
  } catch (e) {
    console.error("college detail query failed", e);
  }

  const branches = [...new Set(cutoffs.map((c) => c.branch_code))];

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <Link href="/colleges" className="text-[13px] text-muted hover:text-accent">
        ← all colleges
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{inst.name}</h1>
      <div className="num mt-2 flex flex-wrap gap-2 text-[13px] text-muted">
        <span className="chip">{inst.inst_code}</span>
        {inst.district && <span className="chip">{inst.district}</span>}
        {inst.region && <span className="chip">{inst.region} region</span>}
        {inst.type && <span className="chip">{inst.type}</span>}
        {inst.fee != null && <span className="chip">fee {"\u20B9"}{inst.fee.toLocaleString("en-IN")} / yr (G.O.118)</span>}
      </div>

      <h2 className="mt-10 text-xl font-semibold">Accreditation</h2>
      <div className="mt-3 divide-y divide-line rounded-2xl border border-line bg-card">
        {accrs.length === 0 && (
          <p className="px-6 py-4 text-[13px] text-muted">
            No accreditation records found. Absence means not verified - ask the college.
          </p>
        )}
        {accrs.map((a, i) => (
          <div key={i} className="flex flex-col gap-1 px-6 py-3.5 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="font-medium">{a.agency}</span>
              {a.branch_code && <span className="chip ml-2">{a.branch_code}</span>}
              <div className="text-[12px] text-muted">{a.detail}</div>
            </div>
            <span className="num text-[13px] text-muted">
              {a.valid_to
                ? (String(a.valid_to).slice(0, 10) >= new Date().toISOString().slice(0, 10)
                    ? "valid to " + String(a.valid_to).slice(0, 10)
                    : "expired " + String(a.valid_to).slice(0, 10))
                : a.status}
            </span>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-semibold">Closing ranks (2025 final round)</h2>
      <p className="num mt-1 text-[12px] text-muted">
        By branch, category, and gender. AU = Andhra Univ area quota, SVU = Sri Venkateswara area, NL = non-local.
      </p>
      {branches.map((b) => (
        <div key={b} className="mt-6">
          <h3 className="num font-semibold">{b}</h3>
          <div className="mt-2 overflow-hidden rounded-xl border border-line bg-card">
            <table className="num w-full text-left text-[13px]">
              <thead className="bg-paper text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">category</th>
                  <th className="px-4 py-2 font-medium">boys</th>
                  <th className="px-4 py-2 font-medium">girls</th>
                  <th className="px-4 py-2 font-medium">local area</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {cutoffs
                  .filter((c) => c.branch_code === b)
                  .map((c, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">{c.category}</td>
                      <td className="px-4 py-2">{c.gender === "M" ? c.closing_rank.toLocaleString("en-IN") : ""}</td>
                      <td className="px-4 py-2">{c.gender === "F" ? c.closing_rank.toLocaleString("en-IN") : ""}</td>
                      <td className="px-4 py-2 text-muted">{c.local_area}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {branches.length === 0 && (
        <p className="mt-4 text-[13px] text-muted">No closing-rank rows found for this college.</p>
      )}
    </div>
  );
}
