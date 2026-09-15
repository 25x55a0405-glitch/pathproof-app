import { NextResponse } from "next/server";
import { runAudit } from "@/lib/audit";
import { DEMO_PROFILE, DEMO_TEXT } from "@/lib/demo-text";
import type { Category, Gender, LocalArea, Profile } from "@/lib/types";

const CATEGORIES = new Set([
  "OC", "EWS", "SC1", "SC2", "SC3", "ST", "BCA", "BCB", "BCC", "BCD", "BCE",
]);
const GENDERS = new Set(["M", "F"]);
const AREAS = new Set(["AU", "SVU", "NL"]);

type Weights = Profile["weights"];

/** Returns a sanitized Profile, or an error message. */
function parseProfile(raw: unknown): { profile: Profile } | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "profile_and_text_required" };
  const p = raw as Record<string, unknown>;

  const rank = Number(p.rank);
  if (!Number.isFinite(rank) || rank < 1 || rank > 300000) {
    return { error: "invalid_rank" };
  }
  const category = String(p.category ?? "");
  if (!CATEGORIES.has(category)) return { error: "invalid_category" };
  const gender = String(p.gender ?? "");
  if (!GENDERS.has(gender)) return { error: "invalid_gender" };
  const localArea = String(p.localArea ?? "");
  if (!AREAS.has(localArea)) return { error: "invalid_local_area" };

  const branches = Array.isArray(p.branches)
    ? p.branches
        .map((b) => String(b).toUpperCase())
        .filter((b) => /^[A-Z]{2,4}$/.test(b))
        .slice(0, 20)
    : [];
  if (branches.length === 0) return { error: "branches_required" };

  const budgetMax = Number(p.budgetMax);
  if (!Number.isFinite(budgetMax) || budgetMax < 0 || budgetMax > 10_000_000) {
    return { error: "invalid_budget" };
  }

  const w = (p.weights ?? {}) as Record<string, unknown>;
  const clamped = (v: unknown, fallback: number): number => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
  };
  const weights: Weights = {
    cost: clamped(w.cost, 0.8),
    branch: 1,
    proximity: clamped(w.proximity, 0.4),
    accreditation: clamped(w.accreditation, 0.6),
  };

  const homeDistrict =
    typeof p.homeDistrict === "string" && /^[A-Z]{2,4}$/.test(p.homeDistrict)
      ? p.homeDistrict
      : null;

  return {
    profile: {
      rank: Math.round(rank),
      category: category as Category,
      gender: gender as Gender,
      localArea: localArea as LocalArea,
      branches,
      budgetMax: Math.round(budgetMax),
      homeDistrict,
      hostel: p.hostel === true,
      weights,
    },
  };
}

export async function POST(req: Request) {
  let body: { profile?: unknown; counselorText?: unknown; demo?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const demo = body.demo === true;
  const profileResult = demo
    ? { profile: DEMO_PROFILE }
    : parseProfile(body.profile);
  if ("error" in profileResult) {
    return NextResponse.json({ error: profileResult.error }, { status: 400 });
  }
  const text = demo
    ? DEMO_TEXT
    : typeof body.counselorText === "string"
      ? body.counselorText
      : "";

  if (!text.trim()) {
    return NextResponse.json({ error: "profile_and_text_required" }, { status: 400 });
  }
  if (text.length > 20000) {
    return NextResponse.json({ error: "text_too_long" }, { status: 400 });
  }

  try {
    const report = await runAudit({ profile: profileResult.profile, counselorText: text });
    return NextResponse.json(report);
  } catch (e) {
    console.error("audit failed", e);
    return NextResponse.json({ error: "audit_failed" }, { status: 500 });
  }
}
