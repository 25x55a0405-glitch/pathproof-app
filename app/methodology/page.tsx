import { Reveal } from "@/components/reveal";

export default function Methodology() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="text-4xl font-semibold tracking-tight">How PathProof decides</h1>
      <p className="mt-3 text-lg text-muted">
        A ranking you can check. Every rule on this page is testable, and every run is logged.
      </p>

      <div className="mt-10 space-y-4">
        {[
          ["Hard filters come first", "Eligibility, budget ceiling, branch, and location constraints are applied before any scoring. A college that fails a hard filter is never rescued by a better placement or reputation score."],
          ["Fixed value ranges", "Each criterion scores against a documented range - never against min-max normalization of the current candidate list. Adding an irrelevant college cannot reorder your shortlist."],
          ["Missing data costs points", "A missing fee or missing accreditation adds an uncertainty penalty. We never substitute a favorable estimate for a missing value."],
          ["Small and Pareto-efficient", "You get five options on the efficiency frontier, not a hundred ranked colleges. Each card shows exactly how much each criterion contributed."],
          ["Sensitivity is shown, not hidden", "The engine re-runs the list under plausible weight changes. Options whose position flips are marked, so you know which choices are solid and which are marginal."],
          ["The AI reads, the engine decides", "The LLM extracts claims from your documents and writes explanations. A deterministic engine does eligibility, filtering, and ranking. The AI can only say what the engine's stored trace contains."],
          ["Reproducible by design", "Same profile, same data version, same weights - same shortlist. Every run is stored with its inputs so a parent, school, or auditor can replay it."],
          ["The incentive firewall", "No per-enrollment commission from colleges. No paid rank boosts. No sale of student leads. If advertising is ever introduced, it sits in a separately labeled unit that shares nothing with the organic ranking."],
        ].map(([h, d], i) => (
          <Reveal key={h} delay={i * 0.03}>
            <div className="rounded-2xl border border-line bg-card p-6">
              <h2 className="text-lg font-semibold">{h}</h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
