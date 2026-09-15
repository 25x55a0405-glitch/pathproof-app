import Link from "next/link";

const links = [
  { href: "/#how", label: "How it works" },
  { href: "/colleges", label: "Explore colleges" },
  { href: "/methodology", label: "Methodology" },
  { href: "/data", label: "Data sources" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-[13px] font-semibold text-paper">P</span>
          PathProof
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-accent">
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/start" className="btn btn-primary text-[13px]">
          Start free audit
        </Link>
      </div>
    </header>
  );
}
