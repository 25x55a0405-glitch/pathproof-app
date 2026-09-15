import Link from "next/link";
import { q } from "@/lib/db";
import { Reveal } from "@/components/reveal";
import { CountUp } from "@/components/count-up";

export const dynamic = "force-dynamic";

const CLAIM_SAMPLES = [
  { text: "\u201Cfee Rs.85,000 per year\u201D", college: "VIJAYAM INSTITUTE OF TECHNOLOGY", verdict: "contradicted", actual: "G.O.Ms.No.118: ₹40,000 all-inclusive" },
  { text: "\u201CNBA accredited\u201D", college: "ADITYA COLLEGE OF ENGINEERING", verdict: "contradicted", actual: "NBA validity ended 30-06-2025" },
  { text: "\u201C100% placement guaranteed\u201D", college: null, verdict: "flagged", actual: "guarantee language — ask for it in writing" },
  { text: "\u201CKAKINADA INSTITUTE OF ENGG. AND TECHNOLOGY — NBA accredited\u201D", college: "KAKINADA INSTITUTE OF ENGG. AND TECHNOLOGY", verdict: "verified", actual: "NBA record found" },
];

const CHECKS = [
  { t: "Fees", d: "Every private-college fee compared with the APHERMC fee order in force (G.O.Ms.No.118, block 2023-24 to 2025-26). All-inclusive annual — the same basis your payment receipt uses." },
  { t: "Accreditation", d: "NBA program-level accreditation with validity dates, and the last published NAAC grade. An expired claim shows its expiry date." },
  { t: "Closing ranks", d: "College-branch-category closing ranks from APSCHE's official last-rank details for the 2025 final round, split by gender and local area." },
  { t: "Guarantee language", d: "\u201CGuaranteed admission\u201D and \u201C100% placement\u201D claims are flagged: under ASCI education advertising rules they must be substantiated." },
];

const FAQ = [
  { q: "Is it free?", a: "Yes during the AP EAPCET pilot. The audit, the shortlist and the reports cost nothing." },
  { q: "Does PathProof say my counselor is corrupt?", a: "No, and it never will. It shows what your counselor's list contained, what the official records say, and which eligible options were missing. We call that a choice-set check, not corruption detection." },
  { q: "What data do you use?", a: "Official APSCHE last-rank details for 2025, the APHERMC fee order G.O.Ms.No.118, NBA's accredited-programs list, NAAC's published list, and AICTE approval records. Every value keeps its source, date, and confidence tier." },
  { q: "Can you guarantee I'll get a seat?", a: "No. Closing ranks are historical records. We show a band across recent years for your exact category, gender, and local area — with honest safe / borderline / reach labels." },
  { q: "What about my data?", a: "We store your rank, category, and preferences to run the audit. Built to DPDP Act 2023 rules: parental consent under 18, deletion on request, no sale of your data, ever." },
];

interface LiveStats {
  colleges: number;
  cutoffs: number;
  fees: number;
  accreditations: number;
}

async function loadStats(): Promise<LiveStats> {
  try {
    const rows = await q<LiveStats>(
      `SELECT (SELECT count(*) FROM institutions)::int AS colleges,
              (SELECT count(*) FROM cutoffs)::int AS cutoffs,
              (SELECT count(*) FROM fees)::int AS fees,
              (SELECT count(*) FROM accreditations)::int AS accreditations`
    );
    return rows[0] ?? { colleges: 0, cutoffs: 0, fees: 0, accreditations: 0 };
  } catch (e) {
    console.error("stats query failed", e);
    return { colleges: 0, cutoffs: 0, fees: 0, accreditations: 0 };
  }
}

function ClaimRow({ verdict, claim, actual }: { verdict: string; claim: string; actual: string }) {
  return (
    <div className="flex flex-col gap-1.5 px-6 py-4 md:flex-row md:items-center md:justify-between md:gap-6">
      <div className="min-w-0">
        <div className="truncate text-[14px] font-medium">{claim}</div>
        <div className="num mt-0.5 text-[13px] text-muted">{actual}</div>
      </div>
      <span className={"chip chip-" + verdict}>{verdict.replace("_", " ")}</span>
    </div>
  );
}

function Stat({ v, label }: { v: number; label: string }) {
  return (
    <div>
      <div className="num text-3xl font-semibold tracking-tight">
        <CountUp to={v} />
      </div>
      <div className="mt-1 text-[13px] text-muted">{label}</div>
    </div>
  );
}

export default async function Home() {
  const stats = await loadStats();
  const dbDown =
    stats.colleges === 0 &&
    stats.cutoffs === 0 &&
    stats.fees === 0 &&
    stats.accreditations === 0;

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-16 pb-14 md:pt-24">
        <Reveal>
          <p className="chip mb-5">AP EAPCET B.Tech · free during pilot</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight md:text-[3.4rem]">
            Upload any counselor&rsquo;s recommendation. See every claim checked — and every college
            they left out.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            PathProof verifies the shortlist you were given against official fee orders, NBA/NAAC
            records, and last year&rsquo;s closing ranks. Then it builds an independent shortlist from
            everything you were eligible for.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/start" className="btn btn-primary">Start free audit</Link>
            <Link href="/colleges" className="btn btn-ghost">Explore verified colleges</Link>
          </div>
          <div className="mt-9 flex flex-wrap gap-2">
            <span className="chip">No per-enrollment commissions</span>
            <span className="chip">No sponsored ranks</span>
            <span className="chip">No student-lead sales</span>
            <span className="chip">Every fact sourced and dated</span>
          </div>
        </Reveal>
      </section>

      {/* Stats — live from the verified database */}
      {dbDown && (
        <div className="border-b border-line bg-[#fffbeb]" role="alert">
          <p className="mx-auto max-w-6xl px-5 py-3 text-[13px] text-[#b45309]">
            Live database stats are unavailable right now (Postgres unreachable). The audit flow
            still works via the demo, but counts below are stale. Start Postgres and reload.
          </p>
        </div>
      )}
      <section className="border-y border-line bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-10 md:grid-cols-4">
          <Stat v={stats.colleges} label="colleges tracked" />
          <Stat v={stats.cutoffs} label="verified closing ranks" />
          <Stat v={stats.fees} label="fees vs official fee order" />
          <Stat v={stats.accreditations} label="accreditation records" />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight">Three steps. Ten minutes.</h2>
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { n: "01", h: "Build your profile", d: "Rank, category, gender, local area, branch, budget ceiling, distance. Two minutes of typing." },
            { n: "02", h: "Upload the counselor's list", d: "A WhatsApp screenshot, a PDF brochure, or pasted text. The AI pulls out every claim: fees, accreditation, cutoff promises, guarantees." },
            { n: "03", h: "Read the audit", d: "Each claim gets a verdict with its official source. Missing colleges appear. Your independent shortlist is five options deep." },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 0.06}>
              <div className="card h-full rounded-2xl border border-line bg-card p-6">
                <div className="num text-sm text-accent">{s.n}</div>
                <h3 className="mt-2 text-lg font-semibold">{s.h}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Sample audit */}
      <section className="border-y border-line bg-card">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight">What an audit looks like</h2>
            <p className="mt-2 max-w-2xl text-muted">
              Every claim gets a verdict, the actual value from the official record, and a clickable
              source. No verdict without evidence.
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-card">
              <div className="border-b border-line px-6 py-4 text-[13px] font-medium text-muted">
                Counselor message · 5 colleges · 6 claims found
              </div>
              <div className="divide-y divide-line">
                {CLAIM_SAMPLES.map((c, i) => (
                  <ClaimRow key={i} verdict={c.verdict} claim={c.text} actual={c.actual} />
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* What we check */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight">What we check</h2>
        </Reveal>
        <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-card">
          {CHECKS.map((c, i) => (
            <Reveal key={c.t} delay={i * 0.04}>
              <div className="flex flex-col gap-1.5 p-6 md:flex-row md:items-baseline md:gap-8">
                <div className="w-40 shrink-0 font-semibold">{c.t}</div>
                <div className="text-[14px] leading-relaxed text-muted">{c.d}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="grid gap-4 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-line bg-card p-7">
              <h3 className="text-xl font-semibold">For students</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">
                See the full eligible set, not the five colleges one person chose for you. Know each
                option&rsquo;s real fee and last year&rsquo;s closing band before you lock web options.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="h-full rounded-2xl border border-line bg-card p-6">
              <h3 className="text-lg font-semibold">For parents</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Every fee, accreditation, and cutoff claim with its official source. Ask better
                questions before paying anything. Download the audit as a record.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-line bg-card">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight">Questions parents ask first</h2>
          </Reveal>
          <div className="mt-6 divide-y divide-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none font-medium marker:hidden">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 py-20 text-center">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Your rank. Your options. Their list is not the whole list.
          </h2>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/start" className="btn btn-primary">Start free audit</Link>
            <Link href="/methodology" className="btn btn-ghost">How the ranking works</Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
