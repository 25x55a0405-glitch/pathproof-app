import { q } from "./db";
import { matchCollege, type InstLite } from "./match";
import type { ClaimCheck } from "./types";

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function inr(n: number): string {
  return "\u20B9" + Math.round(n).toLocaleString("en-IN");
}

function parseRupees(text: string): number | null {
  const m = text.match(/(?:\u20B9|rs\.?\s?)(\d[\d,]*(?:\.\d+)?)/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return Number.isNaN(n) ? null : n;
}

function num(n: number): string {
  return n.toLocaleString("en-IN");
}

/**
 * Institution names change rarely; cache for a minute so a message with many
 * claims doesn't re-fetch the whole table per claim.
 */
let instCache: { at: number; rows: InstLite[] } | null = null;
const INST_TTL_MS = 60_000;

export async function getInstitutions(): Promise<InstLite[]> {
  if (instCache && Date.now() - instCache.at < INST_TTL_MS) return instCache.rows;
  const rows = await q<InstLite>(`SELECT inst_code, name FROM institutions`);
  instCache = { at: Date.now(), rows };
  return rows;
}

export async function findInst(
  name: string | null
): Promise<{ inst_code: string; name: string } | null> {
  if (!name) return null;
  const insts = await getInstitutions();
  const m = matchCollege(name, insts);
  return m ? { inst_code: m.code, name: m.name } : null;
}

export async function verifyClaim(c: ResolvedClaim): Promise<ClaimCheck> {
  const base = {
    claim_text: c.text,
    claim_type: c.type,
    inst_code: null as string | null,
    branch_code: null as string | null,
  };

  if (c.type === "guarantee") {
    return {
      ...base,
      verdict: "flagged",
      actual: null,
      source: "ASCI education advertising guidelines",
      source_id: null,
      note:
        "Guaranteed outcomes must be substantiated. Ask for this in writing; unsubstantiated guarantees are prohibited in education advertising.",
    };
  }

  const inst = await findInst(c.instName);
  if (!inst) {
    return {
      ...base,
      verdict: "not_found",
      actual: null,
      source: null,
      source_id: null,
      note: "College not found in the AP EAPCET 2025 counseling pool",
    };
  }

  if (c.type === "fee") {
    const rows = await q<{ fee_per_year: number | null }>(
      `SELECT tuition_per_year AS fee_per_year FROM fees WHERE inst_code = $1 AND academic_year = '2025-26' LIMIT 1`,
      [inst.inst_code]
    );
    const fee = rows[0]?.fee_per_year ?? null;
    if (fee == null) {
      return {
        ...base,
        inst_code: inst.inst_code,
        verdict: "not_verified",
        actual: null,
        source: null,
        source_id: null,
        note: "No verified fee record for this college",
      };
    }
    const claimed = parseRupees(c.text);
    if (claimed == null) {
      return {
        ...base,
        inst_code: inst.inst_code,
        verdict: "verified",
        actual: inr(fee) + " all-inclusive annual",
        source: "G.O.Ms.No.118 (24-12-2025)",
        source_id: 2,
        note: "College confirmed against counseling records",
      };
    }
    const diff = Math.abs(claimed - fee) / fee;
    if (diff <= 0.05) {
      return {
        ...base,
        inst_code: inst.inst_code,
        verdict: "verified",
        actual: inr(fee),
        source: "G.O.Ms.No.118 (24-12-2025)",
        source_id: 2,
        note: null,
      };
    }
    return {
      ...base,
      inst_code: inst.inst_code,
      verdict: "contradicted",
      actual:
        (claimed < fee
          ? "official fee is higher: "
          : "official fee is lower: ") + inr(fee),
      source: "G.O.Ms.No.118 (24-12-2025)",
      source_id: 2,
      note:
        claimed < fee
          ? "Quoted below the official all-inclusive fee - ask what fills the gap"
          : "Quoted above the official fee",
    };
  }

  if (c.type === "accreditation") {
    // ::text keeps the comparison timezone-safe: pg returns DATE as a
    // JS Date, which stringifies in local time and can shift a day.
    const nba = (
      await q<{ valid_to: string | null }>(
        `SELECT valid_to::text AS valid_to FROM accreditations
         WHERE inst_code = $1 AND agency = 'NBA' AND status = 'accredited'
         ORDER BY COALESCE(valid_to, DATE '1900-01-01') DESC LIMIT 1`,
        [inst.inst_code]
      )
    )[0];
    if (nba?.valid_to && nba.valid_to >= today()) {
      return {
        ...base,
        inst_code: inst.inst_code,
        verdict: "verified",
        actual: "NBA accredited, valid to " + fmtDate(nba.valid_to),
        source: "NBA accredited programs list",
        source_id: 3,
        note: null,
      };
    }
    if (nba?.valid_to) {
      return {
        ...base,
        inst_code: inst.inst_code,
        verdict: "contradicted",
        actual: "NBA accreditation expired on " + fmtDate(nba.valid_to),
        source: "NBA accredited programs list",
        source_id: 3,
        note: null,
      };
    }
    // Institution-level NAAC: newest published grade wins (deterministic).
    const naac = await q<{ detail: string | null }>(
      `SELECT detail FROM accreditations
       WHERE inst_code = $1 AND agency = 'NAAC' AND detail IS NOT NULL
       ORDER BY valid_to DESC NULLS LAST, detail LIMIT 1`,
      [inst.inst_code]
    );
    const grade = naac[0]?.detail ? gradeOf(naac[0].detail) : null;
    if (grade) {
      return {
        ...base,
        inst_code: inst.inst_code,
        verdict: "not_verified",
        actual: "No current NBA record - last published NAAC grade " + grade,
        source: "NAAC valid accreditation list (21-08-2023)",
        source_id: 4,
        note: "NAAC grades are institution-level and from the last published list",
      };
    }
    return {
      ...base,
      inst_code: inst.inst_code,
      verdict: "not_verified",
      actual: null,
      source: null,
      source_id: null,
      note: "No NBA or NAAC record found - ask the college for the certificate",
    };
  }

  if (c.type === "cutoff" && c.branch) {
    const rows = await q<{ lo: number | null; hi: number | null }>(
      `SELECT MIN(closing_rank)::int AS lo, MAX(closing_rank)::int AS hi
       FROM cutoffs WHERE inst_code = $1 AND branch_code = $2
         AND category = $3 AND gender = $4`,
      [inst.inst_code, c.branch, c.category, c.gender]
    );
    const b = rows[0];
    if (!b || b.lo == null || b.hi == null) {
      return {
        ...base,
        inst_code: inst.inst_code,
        branch_code: c.branch,
        verdict: "not_verified",
        actual: null,
        source: null,
        source_id: null,
        note: "No verified closing-rank data for this college-branch-category",
      };
    }
    const bandStr = `${num(b.lo)}\u2013${num(b.hi)}`;
    const claimed = c.text.match(/\d{3,6}/);
    if (claimed) {
      const n = Number(claimed[0]);
      if (n >= b.lo * 0.8 && n <= b.hi * 1.2) {
        return {
          ...base,
          inst_code: inst.inst_code,
          branch_code: c.branch,
          verdict: "verified",
          actual: `2025 final-round closing band ${bandStr}`,
          source: "APSCHE AP EAPCET 2025 Last Rank Details",
          source_id: 1,
          note: null,
        };
      }
      return {
        ...base,
        inst_code: inst.inst_code,
        branch_code: c.branch,
        verdict: "contradicted",
        actual: `2025 final-round closing band ${bandStr}`,
        source: "APSCHE AP EAPCET 2025 Last Rank Details",
        source_id: 1,
        note: "Claimed cutoff does not match the official record",
      };
    }
    return {
      ...base,
      inst_code: inst.inst_code,
      branch_code: c.branch,
      verdict: "verified",
      actual: `2025 final-round closing band ${bandStr}`,
      source: "APSCHE AP EAPCET 2025 Last Rank Details",
      source_id: 1,
      note: null,
    };
  }

  if (c.type === "college") {
    return {
      ...base,
      inst_code: inst.inst_code,
      verdict: "verified",
      actual: inst.name,
      source: "APSCHE AP EAPCET 2025 Last Rank Details",
      source_id: 1,
      note: null,
    };
  }

  return {
    ...base,
    inst_code: inst.inst_code,
    verdict: "not_verified",
    actual: null,
    source: null,
    source_id: null,
    note: "Could not map this claim to a verified record",
  };
}

function fmtDate(v: string | Date | null): string {
  if (!v) return "";
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
}

function gradeOf(detail: string | null): string | null {
  if (!detail) return null;
  const m = detail.match(/NAAC\s+([ABCD]+\+*|C\+*)/i);
  return m ? m[1].toUpperCase() : null;
}

export interface ResolvedClaim {
  text: string;
  type: ClaimCheck["claim_type"];
  instName: string | null;
  branch: string | null;
  category: string;
  gender: string;
}
