import { q } from "./db";
import { extractClaims } from "./extract";
import { verifyClaim } from "./verify";
import { rank } from "./ranker";
import { DATA_VERSION, type AuditReport, type Profile } from "./types";

export async function runAudit(input: {
  profile: Profile;
  counselorText: string;
}): Promise<AuditReport> {
  const profile = input.profile;

  const claims = await extractClaims(input.counselorText);
  // Independent claims verify concurrently — each hits different rows.
  const checks = await Promise.all(
    claims.map((c) =>
      verifyClaim({
        text: c.text,
        type: c.type,
        instName: c.instName,
        branch: c.branch,
        category: profile.category,
        gender: profile.gender,
      })
    )
  );

  const claimedCodes = new Set(
    checks.map((x) => x.inst_code).filter((x): x is string => Boolean(x))
  );

  // One batched query instead of one query per claimed college.
  const budget_violations: AuditReport["audit"]["budget_violations"] = [];
  if (claimedCodes.size > 0) {
    const codes = [...claimedCodes];
    const rows = await q<{ inst_code: string; name: string; fee: number | null }>(
      `SELECT i.inst_code, i.name, f.tuition_per_year AS fee
       FROM institutions i
       LEFT JOIN fees f
         ON f.inst_code = i.inst_code AND f.academic_year = '2025-26'
       WHERE i.inst_code = ANY($1)`,
      [codes]
    );
    for (const r of rows) {
      if (r.fee != null && r.fee > profile.budgetMax) {
        budget_violations.push({
          inst_code: r.inst_code,
          name: r.name,
          fee: r.fee,
          budget: profile.budgetMax,
        });
      }
    }
  }

  const shortlist = await rank(profile);
  const omissions = shortlist
    .filter((s) => !claimedCodes.has(s.inst_code))
    .slice(0, 4)
    .map((s) => ({
      inst_code: s.inst_code,
      name: s.name,
      branch_code: s.branch_code,
      fee: s.fee,
      band_high: s.band_max,
    }));

  const report: AuditReport = {
    claims: checks,
    audit: {
      budget_violations,
      omissions,
      guarantee_flags: checks
        .filter((x) => x.verdict === "flagged")
        .map((x) => x.claim_text),
    },
    shortlist,
    data_version: DATA_VERSION,
    generated_at: new Date().toISOString(),
  };

  // Persist for replay/audit — never fail the user-facing audit if logging fails.
  try {
    await q(
      `INSERT INTO recommendation_runs (student_profile, weights, data_version, shortlist, audit_trace)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        JSON.stringify(profile),
        JSON.stringify(profile.weights),
        DATA_VERSION,
        JSON.stringify(report.shortlist),
        JSON.stringify({ claims: checks, audit: report.audit }),
      ]
    );
  } catch (e) {
    console.error("recommendation_runs insert failed (non-fatal)", e);
  }

  return report;
}
