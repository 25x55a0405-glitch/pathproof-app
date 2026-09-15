import { q } from "./db";
import { type Profile, type ShortlistItem } from "./types";

interface CutoffRow {
  inst_code: string;
  name: string;
  district: string;
  district_code: string;
  type_code: string;
  branch_code: string;
  branch_name: string;
  fee: number | null;
  local_area: string;
  closing_rank: number;
  nba_valid_to: string | null;
  naac_grade: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  PVT: "Private",
  UNIV: "University dept",
  SF: "Self-financed (university dept.)",
  SS: "Self-supporting (university dept.)",
  PU: "Private university",
};

function gradeOf(detail: string | null): string | null {
  if (!detail) return null;
  const m = detail.match(/NAAC\s+([ABCD]+\+*|C\+*)/i);
  return m ? m[1] : null;
}

const GRADE_POINTS: Record<string, number> = {
  "A++": 1, "A+": 0.9, A: 0.8, "B++": 0.7, "B+": 0.6, B: 0.55,
  "C++": 0.5, C: 0.4, D: 0.3,
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const today = () => new Date().toISOString().slice(0, 10);

function addMonths(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function gradePoints(grade: string | null): number {
  if (!grade) return 0.15;
  return GRADE_POINTS[grade.trim().toUpperCase()] ?? 0.45;
}

/**
 * Deterministic two-stage ranker. The LLM never calls this; only the API does.
 * Fixed value ranges, no candidate-set normalization. Missing data carries an
 * uncertainty penalty and is never silently replaced with a favorable estimate.
 */
export async function rank(profile: Profile): Promise<ShortlistItem[]> {
  if (!profile.branches.length) return [];

  // Date columns are cast ::text so string comparisons stay timezone-safe.
  const rows = await q<CutoffRow>(
    `SELECT c.inst_code, i.name, i.district, i.district_code, i.type_code,
            c.branch_code, b.name AS branch_name, c.local_area, c.closing_rank,
            f.tuition_per_year AS fee,
            nba.valid_to::text AS nba_valid_to, naac.naac_detail AS naac_grade
     FROM cutoffs c
     JOIN institutions i ON i.inst_code = c.inst_code
     JOIN branches b ON b.branch_code = c.branch_code
     LEFT JOIN fees f ON f.inst_code = c.inst_code AND f.academic_year = '2025-26'
     LEFT JOIN LATERAL (
       SELECT a.valid_to FROM accreditations a
       WHERE a.inst_code = c.inst_code AND a.branch_code = c.branch_code
         AND a.agency = 'NBA' AND a.status = 'accredited'
       ORDER BY COALESCE(a.valid_to, DATE '1900-01-01') DESC LIMIT 1
     ) nba ON TRUE
     LEFT JOIN LATERAL (
        SELECT a2.detail AS naac_detail
       FROM accreditations a2
       WHERE a2.inst_code = c.inst_code AND a2.branch_code IS NULL
         AND a2.agency = 'NAAC' AND a2.detail IS NOT NULL
       ORDER BY a2.valid_to DESC NULLS LAST, a2.detail DESC LIMIT 1
     ) naac ON TRUE
     WHERE c.branch_code = ANY($1) AND c.category = $2 AND c.gender = $3
       AND c.closing_rank >= $4 * 0.55 AND c.closing_rank <= $4 * 2.2`,
    [profile.branches, profile.category, profile.gender, profile.rank]
  );

  if (!rows.length) return [];

  type Group = {
    inst_code: string; name: string; district: string; district_code: string;
    type_code: string; branch_code: string; branch_name: string;
    fee: number | null; ranks: { area: string; rank: number }[];
    nba_valid_to: string | null; naac_grade: string | null;
  };
  const groups = new Map<string, Group>();
  for (const r of rows) {
    const key = `${r.inst_code}|${r.branch_code}`;
    const g = groups.get(key) ?? {
      inst_code: r.inst_code, name: r.name, district: r.district,
      district_code: r.district_code, type_code: r.type_code,
      branch_code: r.branch_code, branch_name: r.branch_name,
      fee: r.fee, ranks: [] as { area: string; rank: number }[],
      nba_valid_to: r.nba_valid_to, naac_grade: r.naac_grade,
    };
    g.ranks.push({ area: r.local_area, rank: r.closing_rank });
    if (r.nba_valid_to && (!g.nba_valid_to || r.nba_valid_to > g.nba_valid_to)) {
      g.nba_valid_to = r.nba_valid_to;
    }
    if (r.naac_grade) g.naac_grade = gradeOf(r.naac_grade);
    groups.set(key, g);
  }

  const w = profile.weights;
  const wsum = 1 + w.cost + w.proximity + w.accreditation;

  const scored: ShortlistItem[] = [];

  for (const g of groups.values()) {
    // Hard filter: budget ceiling is never compensated by ranking score.
    if (g.fee != null && g.fee > profile.budgetMax) continue;

    const own = g.ranks.filter((x) => x.area === profile.localArea).map((x) => x.rank);
    const pool_ = own.length ? own : g.ranks.map((x) => x.rank);
    const band_min = Math.min(...pool_);
    const band_max = Math.max(...pool_);
    const span = Math.max(1, band_max - band_min);

    let readiness: number;
    let verdict: ShortlistItem["verdict"];
    if (profile.rank <= band_min) {
      readiness = 1;
      verdict = "safe";
    } else if (profile.rank <= band_max) {
      readiness = 1 - 0.6 * ((profile.rank - band_min) / span);
      verdict = "borderline";
    } else if (profile.rank <= band_max * 1.25) {
      readiness = 0.15;
      verdict = "reach";
    } else {
      continue; // hard filter: never compensated
    }

    const afford = g.fee == null ? 0.5 : clamp01(1 - g.fee / Math.max(profile.budgetMax, 1));
    const nbaPts =
      g.nba_valid_to == null
        ? 0.15
        : g.nba_valid_to >= today()
          ? 1
          : g.nba_valid_to >= addMonths(today(), -18)
            ? 0.5
            : 0.1;
    const accred = 0.6 * nbaPts + 0.4 * gradePoints(g.naac_grade);
    const prox = profile.homeDistrict
      ? g.district_code === profile.homeDistrict
        ? 1
        : 0.55
      : 0.5;

    let utility =
      (readiness + w.cost * afford + w.proximity * prox + w.accreditation * accred) / wsum;
    utility -= (g.fee == null ? 0.05 : 0) + (g.nba_valid_to ? 0 : 0.03);
    utility = Math.round(clamp01(utility) * 100) / 100;

    scored.push({
      inst_code: g.inst_code,
      name: g.name,
      district: g.district,
      district_code: g.district_code,
      type: TYPE_LABEL[g.type_code] ?? g.type_code,
      branch_code: g.branch_code,
      branch_name: g.branch_name,
      fee: g.fee,
      band_min,
      band_max,
      nba_valid_to: g.nba_valid_to,
      naac_grade: g.naac_grade,
      utility,
      contribution: {
        readiness: Math.round(readiness * 100),
        cost: Math.round(afford * 100),
        proximity: Math.round(prox * 100),
        accreditation: Math.round(accred * 100),
      },
      verdict,
      unstable: false,
    });
  }

  scored.sort((a, b) => b.utility - a.utility);

  // Pareto-style greedy pick: skip candidates strictly dominated on
  // (utility, cost, district-match) by an already-picked option
  const picked: ShortlistItem[] = [];
  for (const c of scored) {
    if (picked.length >= 5) break;
    const dominated = picked.some(
      (p) =>
        p.utility >= c.utility &&
        (p.fee ?? Number.POSITIVE_INFINITY) <= (c.fee ?? Number.POSITIVE_INFINITY) &&
        (!profile.homeDistrict ||
          p.district_code === profile.homeDistrict ||
          p.district_code === c.district_code)
    );
    if (!dominated) picked.push(c);
  }

  // sensitivity: flag picks whose position moves >= 3 places under weight jitter
  for (const c of picked) {
    const base = scored.findIndex(
      (x) => x.inst_code === c.inst_code && x.branch_code === c.branch_code
    );
    let worst = 0;
    for (const k of ["cost", "proximity", "accreditation"] as const) {
      const jittered = [...scored]
        .map((s) => ({ s, u: recompute(profile, s, k) }))
        .sort((a, b) => b.u - a.u);
      const p = jittered.findIndex(
        (x) => x.s.inst_code === c.inst_code && x.s.branch_code === c.branch_code
      );
      if (p >= 0) worst = Math.max(worst, Math.abs(p - base));
    }
    c.unstable = worst >= 3;
  }

  return picked;
}

function recompute(
  profile: Profile,
  c: ShortlistItem,
  key: "cost" | "proximity" | "accreditation"
): number {
  const w = Math.min(1, (profile.weights[key] ?? 0) * 1.4 + 0.1);
  const weights = { ...profile.weights, [key]: w };
  const wsum = 1 + weights.cost + weights.proximity + weights.accreditation;
  // Mirror the main utility formula, including the missing-data penalty,
  // so sensitivity flags don't drift from the displayed ranking.
  const penalty = (c.fee == null ? 0.05 : 0) + (c.nba_valid_to ? 0 : 0.03);
  return clamp01(
    (c.contribution.readiness / 100 +
      (weights.cost * c.contribution.cost) / 100 +
      (weights.proximity * c.contribution.proximity) / 100 +
      (weights.accreditation * c.contribution.accreditation) / 100) /
      wsum -
      penalty
  );
}
