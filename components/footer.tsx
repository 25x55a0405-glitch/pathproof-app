import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line bg-card">
      <div className="mx-auto max-w-6xl px-5 py-10 text-sm text-muted">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="font-semibold text-ink">PathProof</div>
            <p className="mt-2 max-w-xs text-[13px] leading-relaxed">
              Ranks eligible options without institution referral payments, explains every criterion, and links each factual claim to its source.
            </p>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-ink">Product</div>
            <ul className="mt-2 space-y-1.5">
              <li><Link className="hover:text-accent" href="/start">Start free audit</Link></li>
              <li><Link className="hover:text-accent" href="/colleges">Explore colleges</Link></li>
              <li><Link className="hover:text-accent" href="/methodology">Methodology</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-ink">Trust</div>
            <ul>
              <li><Link className="hover:text-accent" href="/data">Data sources</Link></li>
              <li><Link className="hover:text-accent" href="/privacy">Privacy (DPDP)</Link></li>
              <li><Link className="hover:text-accent" href="/terms">Terms</Link></li>
              <li><Link className="hover:text-accent" href="/contact">Contact & grievances</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-ink">Language</div>
            <p className="mt-1.5 text-[13px]">English · తెలుగు (coming)</p>
          </div>
        </div>
        <p className="mt-8 border-t border-line pt-4 text-[12px] leading-relaxed text-muted">
          PathProof ranks eligible options without institution referral payments, explains every
          criterion, and links each factual claim to its source. Closing ranks are historical records,
          not admission predictions. Pilot scope: AP EAPCET B.Tech.
        </p>
      </div>
    </footer>
  );
}
