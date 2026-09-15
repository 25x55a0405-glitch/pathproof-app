"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AuditReport, Profile, ShortlistItem, ClaimCheck } from "@/lib/types";
import { DEMO_PROFILE, DEMO_TEXT } from "@/lib/demo-text";

const LABEL: Record<string, string> = {
  verified: "verified",
  not_verified: "not verified",
  contradicted: "contradicted",
  flagged: "flagged",
  not_found: "not found",
};

type Tab = "claims" | "audit" | "shortlist";

export default function ReportPage() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<Tab>("claims");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function runAudit(p: Profile, counselorText: string) {
      setProfile(p);
      setError(null);
      try {
        const res = await fetch("/api/audit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profile: p, counselorText }),
        });
        if (!res.ok) throw new Error();
        setReport((await res.json()) as AuditReport);
      } catch {
        setError("Could not run the audit. Go back to the upload page and try again.");
      }
    }
    let prof: Profile = DEMO_PROFILE;
    let text = DEMO_TEXT;
    try {
      const pRaw = sessionStorage.getItem("pathproof.profile");
      const tRaw = sessionStorage.getItem("pathproof.counselorText");
      if (pRaw) prof = JSON.parse(pRaw) as Profile;
      if (tRaw) text = tRaw;
    } catch {
      // private-mode storage — fall back to demo
    }
    void runAudit(prof, text);
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center">
        <p className="text-sm text-contradicted">{error}</p>
        <Link href="/upload" className="btn btn-ghost mt-5">Back to upload</Link>
      </div>
    );
  }

  if (!report || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24">
        <div className="scan-pulse rounded-2xl border border-line bg-card p-10 text-center">
          <p className="text-sm font-medium">Checking claims against official records...</p>
          <p className="mt-1 text-[13px] text-muted">Fees - accreditation - closing ranks</p>
        </div>
      </div>
    );
  }

  const nIssues = report.claims.filter(
    (c) => c.verdict === "contradicted" || c.verdict === "not_verified" || c.verdict === "flagged"
  ).length;

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Audit report</h1>
          <p className="num mt-1.5 text-[13px] text-muted">
            Rank {profile.rank.toLocaleString("en-IN")} · {profile.category} · {profile.gender === "M" ? "Boys" : "Girls"} · {profile.localArea === "AU" ? "AU region" : profile.localArea === "SVU" ? "SVU region" : "non-local"} · budget {"\u20B9"}{profile.budgetMax.toLocaleString("en-IN")}
          </p>
        </div>
        <Link href="/start" className="btn btn-ghost text-[13px]">Edit profile</Link>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <SummaryCard n={report.claims.length} label="claims checked" tone="neutral" />
        <SummaryCard n={nIssues} label="need attention" tone="warn" />
        <SummaryCard n={report.shortlist.length} label="independent options" tone="good" />
      </div>

      <div className="mt-8 flex gap-2 border-b border-line">
        {(
          [
            ["claims", "Claim check"],
            ["audit", "Choice-set audit"],
            ["shortlist", "Independent shortlist"],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={
              "rounded-t-lg border-b-2 px-4 py-2.5 text-sm " +
              (tab === k
                ? "border-accent font-medium text-ink"
                : "border-transparent text-muted hover:text-ink")
            }
          >
            {k === "claims" ? `Claim check (${report.claims.length})` : label}
          </button>
        ))}
      </div>

      {tab === "claims" && <ClaimsList claims={report.claims} />}
      {tab === "audit" && <AuditView report={report} />}
      {tab === "shortlist" && <ShortlistView report={report} />}

      <p className="num mt-10 border-t border-line pt-4 text-[12px] text-muted">
        data version {report.data_version} · generated {new Date(report.generated_at).toLocaleString("en-IN")} ·
        {" "}same profile + same data + same weights = same result
      </p>
    </div>
  );
}

function ClaimsList({ claims }: { claims: ClaimCheck[] }) {
  return (
    <div className="mt-5 divide-y divide-line rounded-2xl border border-line bg-card">
      {claims.map((c, i) => (
        <div key={i} className="flex flex-col gap-2 px-6 py-4 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="min-w-0">
            <div className="text-[14px] font-medium">{c.claim_text}</div>
            <div className="num mt-0.5 text-[13px] text-muted">
              {c.actual ? "actual: " + c.actual : c.note || ""}
            </div>
            {c.note && <div className="mt-1 text-[12px] text-muted">{c.note}</div>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {c.source && <span className="chip">{c.source}</span>}
            <span className={"chip chip-" + c.verdict}>{LABEL[c.verdict] ?? c.verdict}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditView({ report }: { report: AuditReport }) {
  const a = report.audit;
  return (
    <div className="mt-5 space-y-4">
      <Card title="Budget violations" sub={"colleges above your " + ("\u20B9") + " ceiling"}>
        {a.budget_violations.length === 0 ? (
          <Empty text="None - every college they named fits your budget." />
        ) : (
          a.budget_violations.map((v) => (
            <Row key={v.inst_code}>
              <span className="font-medium">{v.name}</span>
              <span className="num text-muted">
                {"\u20B9"}{(v.fee ?? 0).toLocaleString("en-IN")} vs your {"\u20B9"}{v.budget.toLocaleString("en-IN")} limit
              </span>
            </Row>
          ))
        )}
      </Card>

      <Card title="Omitted from their list" sub="eligible options with similar closing bands they did not show">
        {a.omissions.length === 0 ? (
          <Empty text="No clear omissions found in this audit." />
        ) : (
          a.omissions.map((o) => (
            <Row key={o.inst_code + o.branch_code}>
              <span className="font-medium">{o.name}</span>
              <span className="num text-muted">
                {o.branch_code} · {o.fee ? "\u20B9" + o.fee.toLocaleString("en-IN") : "fee not verified"}
                {o.band_high ? " · closed ≤ " + o.band_high.toLocaleString("en-IN") : ""}
              </span>
            </Row>
          ))
        )}
      </Card>

      <Card title="Guarantee language" sub="claims that need written substantiation under ASCI rules">
        {a.guarantee_flags.length === 0 ? (
          <Empty text="No guarantee-style claims found." />
        ) : (
          a.guarantee_flags.map((g, i) => <Row key={i}><span>{g}</span></Row>)
        )}
      </Card>

      <p className="text-[12px] leading-relaxed text-muted">
        This is a choice-set audit, not an accusation. Counselors are not required to show every
        option - but you are allowed to see the whole set before you decide.
      </p>
    </div>
  );
}

function ShortlistView({ report }: { report: AuditReport }) {
  return (
    <div className="mt-5">
      <div className="space-y-3">
        {report.shortlist.map((s) => (
          <ShortlistCard key={s.inst_code + s.branch_code} item={s} />
        ))}
      </div>
      <p className="mt-5 text-[12px] leading-relaxed text-muted">
        Ranked by the transparent engine: readiness fit + cost fit + proximity + accreditation
        evidence - an uncertainty penalty for anything missing. Hard filters were applied first and
        are never traded away.
      </p>
    </div>
  );
}

function ShortlistCard({ item }: { item: ShortlistItem }) {
  return (
    <div className="card rounded-2xl border border-line bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{item.name}</div>
          <div className="text-[13px] text-muted">
            {item.branch_name} · {item.district} · {item.type}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={"chip " + (item.verdict === "safe" ? "chip-verified" : item.verdict === "borderline" ? "chip-not_verified" : "chip-contradicted")}>
            {item.verdict}
          </span>
          {item.unstable && <span className="chip">position shifts with weights</span>}
        </div>
      </div>
      <div className="num mt-3 grid grid-cols-2 gap-2 text-[13px] text-muted sm:grid-cols-4">
        <div>
          fee<br />
          <b className="text-ink">{item.fee ? "\u20B9" + item.fee.toLocaleString("en-IN") : "not verified"}</b>
        </div>
        <div>
          2025 closing band<br />
          <b>{item.band_min?.toLocaleString("en-IN") ?? "?"} - {item.band_max?.toLocaleString("en-IN") ?? "?"}</b>
        </div>
        <div>
          NBA<br />
          <b>{item.nba_valid_to ? (String(item.nba_valid_to).slice(0, 10) >= new Date().toISOString().slice(0, 10) ? "valid to " + String(item.nba_valid_to).slice(0, 10) : "expired " + String(item.nba_valid_to).slice(0, 10)) : "no record"}</b>
        </div>
        <div>
          NAAC<br />
          <b>{item.naac_grade ?? "not published"}</b>
        </div>
      </div>
      <div className="mt-4 space-y-1.5">
        {Object.entries(item.contribution).map(([k, v]) => (
          <div key={k} className="flex items-center gap-3 text-[12px]">
            <span className="w-24 shrink-0 text-muted">{k}</span>
            <div className="h-1.5 flex-1 rounded-full bg-line/60">
              <div className="h-full rounded-full" style={{ width: v + "%", background: "var(--accent)" }} />
            </div>
            <span className="num w-10 text-right text-muted">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-6">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-0.5 text-[12px] text-muted">{sub}</p>
      <div className="mt-3 divide-y divide-line">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:justify-between md:gap-6">
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-3 text-[13px] text-muted">{text}</p>;
}

function SummaryCard({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className={"num text-2xl font-semibold " + (tone === "warn" && n > 0 ? "text-unverified" : "")}>
        {n}
      </div>
      <div className="mt-0.5 text-[12px] text-muted">{label}</div>
    </div>
  );
}
