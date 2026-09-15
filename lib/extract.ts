import { matchCollege, type InstLite } from "./match";
import { getInstitutions } from "./verify";

export interface ExtractedClaim {
  text: string;
  type: "fee" | "accreditation" | "cutoff" | "guarantee" | "college" | "other";
  instName: string | null;
  branch: string | null;
}

const KNOWN_BRANCHES: [RegExp, string][] = [
  [/computer science|cse\b/i, "CSE"],
  [/information technology|\bIT\b/i, "INF"],
  [/electronics and communication|\bece\b/i, "ECE"],
  [/electrical and electronics|\beee\b/i, "EEE"],
  [/mechanical/i, "MEC"],
  [/civil/i, "CIV"],
];

function guessBranch(line: string): string | null {
  for (const [re, code] of KNOWN_BRANCHES) {
    if (re.test(line)) return code;
  }
  return null;
}

const SYSTEM_PROMPT =
  "You extract factual claims from Indian college-counseling messages. " +
  'Return JSON {"claims":[{"text":"<verbatim claim line>","type":"fee|accreditation|cutoff|guarantee|college|other","college":"<college name or null>","branch":"<branch name or null>"}]}. ' +
  "type=fee for any rupee amount, type=accreditation for NBA/NAAC/approval claims, type=cutoff for rank/closing-rank claims, type=guarantee for guaranteed admission/placement language, type=college for plain college mentions. Do not invent claims.";

async function llmExtract(text: string): Promise<ExtractedClaim[] | null> {
  const key = process.env.LLM_API_KEY;
  if (!key) return null;
  const base = process.env.LLM_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";
  try {
    const res = await fetch(base + "/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + key },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text.slice(0, 8000) },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      claims?: { text?: unknown; type?: unknown; college?: unknown; branch?: unknown }[];
    };
    const out: ExtractedClaim[] = [];
    for (const c of parsed.claims ?? []) {
      const t = String(c.text ?? "");
      if (!t) continue;
      const branchRaw = typeof c.branch === "string" && c.branch.length > 1 ? c.branch : null;
      out.push({
        text: t.slice(0, 300),
        type: normalizeType(String(c.type ?? "other")),
        instName: typeof c.college === "string" && c.college ? c.college : null,
        // LLMs may return "Computer Science" or "CSE" — normalize to codes.
        branch: branchRaw ? (guessBranch(branchRaw) ?? branchRaw.toUpperCase()) : null,
      });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

function normalizeType(v: string): ExtractedClaim["type"] {
  const m: Record<string, ExtractedClaim["type"]> = {
    fee: "fee",
    accreditation: "accreditation",
    cutoff: "cutoff",
    guarantee: "guarantee",
    college: "college",
    other: "other",
  };
  return m[v.toLowerCase()] ?? "other";
}

/** Deterministic fallback extractor: the product works before any LLM key is connected. */
export async function fallbackExtract(text: string): Promise<ExtractedClaim[]> {
  const insts: InstLite[] = await getInstitutions();
  const out: ExtractedClaim[] = [];
  // Split on newlines, bullets, and numbered-list boundaries — never mid-sentence.
  const lines = text
    .split(/\r?\n/)
    .flatMap((l) => l.split(/\s*[•\u2022|]\s*/))
    .flatMap((l) => l.split(/\s+(?=(?:\d{1,2}[.)]\s+[A-Z]))/));
  for (const raw of lines) {
    const line = raw.trim();
    if (line.length < 8) continue;
    if (mergeContinuation(out, line)) continue;
    const match = matchCollege(line, insts);
    const type = guessType(line, match !== null);
    if (type === "other") continue;
    if ((type === "cutoff" || type === "accreditation") && !match) continue;
    out.push({
      text: line.slice(0, 300),
      type,
      instName: match ? match.name : null,
      branch: guessBranch(line),
    });
    if (type === "guarantee" && match) {
      const stripped = line
        .replace(/guaranteed?[^,.;]*/gi, "")
        .replace(/100%\s*(placement|admission)/gi, "")
        .trim();
      let subType: ExtractedClaim["type"] | null = null;
      if (/(?:\u20B9|rs\.?\s?\d)/i.test(stripped)) subType = "fee";
      else if (/nba|naac|accredit/i.test(stripped)) subType = "accreditation";
      if (subType) {
        out.push({
          text: stripped.slice(0, 300),
          type: subType,
          instName: match.name,
          branch: guessBranch(stripped),
        });
      }
    }
  }
  return out;
}

function mergeContinuation(out: ExtractedClaim[], line: string): boolean {
  if (!/^(and|or|&|,)\b/i.test(line.trim())) return false;
  if (out.length === 0) return false;
  const prev = out[out.length - 1];
  prev.text = (prev.text + " " + line.trim()).slice(0, 300);
  return true;
}

function guessType(line: string, hasCollege: boolean): ExtractedClaim["type"] {
  if (/guarantee|assured|100%\s*(placement|admission)|registration amount|block your seat|block seats/i.test(line)) return "guarantee";
  if (/(?:\u20B9|rs\.?\s?\d)/i.test(line)) return "fee";
  if (/nba|naac|accredit/i.test(line)) return "accreditation";
  if (/rank|cutoff/i.test(line)) return "cutoff";
  if (hasCollege) return "college";
  return "other";
}

export async function extractClaims(text: string): Promise<ExtractedClaim[]> {
  const viaLlm = await llmExtract(text);
  if (viaLlm && viaLlm.length) return viaLlm;
  return fallbackExtract(text);
}
