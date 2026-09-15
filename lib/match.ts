const GENERIC = new Set([
  "INSTITUTE", "COLLEGE", "ENGINEERING", "TECHNOLOGY", "SCIENCE",
  "AND", "OF", "THE", "FOR", "ENGG", "INSTT",
]);

export interface InstLite {
  inst_code: string;
  name: string;
}

export interface CollegeMatch {
  code: string;
  name: string;
  hits: number;
}

function significantTokens(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !GENERIC.has(w));
}

function normLine(s: string): string {
  return " " + s.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ") + " ";
}

/**
 * Token-coverage matcher: a college matches when at least 2 of its
 * significant tokens appear in the line (or its full normalized name is
 * contained in the line), with at least half the significant tokens covered.
 * Ties break toward the more specific (longer) name.
 */
export function matchCollege(line: string, insts: InstLite[]): CollegeMatch | null {
  const up = normLine(line);
  let best: { code: string; name: string; score: number; tokens: number; coverage: number } | null = null;
  for (const inst of insts) {
    const tokens = significantTokens(inst.name);
    if (tokens.length === 0) continue;
    const hits = tokens.filter((t) => up.includes(t)).length;
    const exact = up.includes(normLine(inst.name).trim());
    if (!exact && hits < 2) continue;
    if (!exact && hits < Math.ceil(tokens.length * 0.5)) continue;
    const coverage = hits / tokens.length;
    const score = hits + (exact ? 100 : 0);
    if (
      best === null ||
      score > best.score ||
      (score === best.score && (coverage > best.coverage || tokens.length > best.tokens))
    ) {
      best = { code: inst.inst_code, name: inst.name, score, tokens: tokens.length, coverage };
    }
  }
  return best ? { code: best.code, name: best.name, hits: best.score } : null;
}
