#!/usr/bin/env node
/**
 * PathProof dev-data seeder.
 *
 *   node db/seed.mjs        (or: npm run db:seed)
 *
 * Applies db/schema.sql, then loads dev sample data:
 *   - 5 named colleges pinned to the demo counselor message (/report demo flow)
 *   - 269 generated colleges across the 13 AP districts (274 total)
 *   - 188 fee rows, ~48k closing-rank rows, 579 accreditation records
 *
 * Reads DATABASE_URL; falls back to the same local default as lib/db.ts.
 * Idempotent: truncates and re-seeds on every run.
 */
import { readFileSync } from "node:fs";
import pgPkg from "pg";

const { Pool } = pgPkg;
const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://pathproof:pathproof_dev@127.0.0.1:5432/pathproof";
const pool = new Pool({ connectionString });

/* ---------------- deterministic RNG (same data every run) ---------------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0;
    return (t ^ (t >>> 14)) >>> 0;
  };
}
const rand = mulberry32(0x5eed);
const between = (lo, hi) => lo + rand() * (hi - lo);
const iBetween = (lo, hi) => Math.floor(between(lo, hi + 1));
const pickFrom = (arr) => arr[Math.floor(rand() * arr.length)];
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/* ------------------------------- reference ------------------------------ */
// [code, name, branch-rank factor] — factor widens closing ranks vs CSE.
const BRANCHES = [
  ["CSE", "Computer Science", 1.0],
  ["CSM", "CSE (AI & ML)", 1.25],
  ["CSD", "CSE (Data Science)", 1.45],
  ["CSC", "CSE (Cyber Security)", 1.55],
  ["CAI", "CSE (Artificial Intelligence)", 1.4],
  ["AID", "AI & Data Science", 1.7],
  ["INF", "Information Technology", 1.8],
  ["ECE", "Electronics & Communication", 2.2],
  ["EEE", "Electrical & Electronics", 3.0],
  ["MEC", "Mechanical Engineering", 4.5],
  ["CIV", "Civil Engineering", 5.5],
  ["CHE", "Chemical Engineering", 5.0],
];
const BRANCH_FACTOR = Object.fromEntries(BRANCHES.map(([c, , f]) => [c, f]));

const CATEGORIES = [
  ["OC", 1], ["EWS", 2.1], ["SC1", 6.5], ["SC2", 7.2], ["SC3", 7.8], ["ST", 9.5],
  ["BCA", 3.4], ["BCB", 3.0], ["BCC", 3.8], ["BCD", 2.9], ["BCE", 3.6],
];
const GENDERS = [["M", 1], ["F", 1.12]];

// [district_code, district, region, towns]
const DISTRICTS = [
  ["SKL", "Srikakulam", "AU", ["Srikakulam", "Rajam", "Tekkali"]],
  ["VZM", "Vizianagaram", "AU", ["Vizianagaram", "Bobbili", "Parvathipuram"]],
  ["VSP", "Visakhapatnam", "AU", ["Visakhapatnam", "Anakapalli", "Gajuwaka"]],
  ["EG", "East Godavari", "AU", ["Kakinada", "Rajahmundry", "Amalapuram", "Tuni"]],
  ["WG", "West Godavari", "AU", ["Bhimavaram", "Eluru", "Tadepalligudem", "Narsapur"]],
  ["KRI", "Krishna", "AU", ["Vijayawada", "Machilipatnam", "Gudivada", "Nuzvid"]],
  ["GTR", "Guntur", "AU", ["Guntur", "Tenali", "Bapatla", "Narasaraopet"]],
  ["PKS", "Prakasam", "AU", ["Ongole", "Chirala", "Markapur"]],
  ["NLR", "Nellore", "SVU", ["Nellore", "Gudur", "Kavali"]],
  ["ATP", "Anantapur", "SVU", ["Anantapur", "Guntakal", "Hindupur"]],
  ["KNL", "Kurnool", "SVU", ["Kurnool", "Nandyal", "Adoni"]],
  ["CTR", "Chittoor", "SVU", ["Tirupati", "Chittoor", "Madanapalle"]],
  ["KDP", "Kadapa", "SVU", ["Kadapa", "Proddatur", "Rayachoty"]],
];

const PREFIXES = [
  "SRI", "SREE", "VASAVI", "SARASWATI", "NARAYANA", "VIKAS", "PRAGATI",
  "GODAVARI", "RAGHU", "CHAITANYA", "VISWANADHA", "SWARNANDHRA", "BVC",
  "SANKETIKA", "VIGNAN", "GMR", "RAJAMAHENDRI", "PINDI", "SAGI", "MANTHRI",
  "SRI VASAVI", "LAKIREDDY", "SIR C R REDDY", "DADI", "ANIL", "GUDLAVALLERU",
];
const SUFFIXES = [
  "COLLEGE OF ENGINEERING AND TECHNOLOGY",
  "INSTITUTE OF ENGINEERING AND TECHNOLOGY",
  "COLLEGE OF ENGINEERING",
  "INSTITUTE OF TECHNOLOGY AND SCIENCES",
  "ENGINEERING COLLEGE",
  "INSTITUTE OF TECHNOLOGY",
];

// Pinned to the demo counselor message (lib/demo-text.ts) so the /report demo
// flow produces the same verified/contradicted/flagged verdicts as the copy.
const NAMED = [
  {
    inst_code: "PVPW", name: "PRASAD V POTLURI SIDDHARTHA INSTT OF TECHNOLOGY",
    district: "Krishna", district_code: "KRI", region: "AU",
    fee: 105000, branches: ["CSE", "CSM", "INF", "ECE"], baseRank: 6000,
    nba: { CSE: ["2024-07-01", "2027-06-30"] },
    naac: "NAAC A+ (CGPA 3.52) valid up to 31-03-2028",
  },
  {
    inst_code: "ADCE", name: "ADITYA COLLEGE OF ENGINEERING",
    district: "East Godavari", district_code: "EG", region: "AU",
    fee: 62000, branches: ["CSE", "ECE", "MEC"], baseRank: 55000,
    nba: { CSE: ["2022-07-01", "2025-06-30"] }, // expired -> contradicted
    naac: "NAAC B++ (CGPA 2.87) valid up to 30-06-2027",
  },
  {
    inst_code: "VJIT", name: "VIJAYAM INSTITUTE OF TECHNOLOGY",
    district: "Chittoor", district_code: "CTR", region: "SVU",
    fee: 40000, branches: ["CSE", "CSM", "ECE", "MEC"], baseRank: 85000,
    nba: {}, naac: null,
  },
  {
    inst_code: "KIET", name: "KAKINADA INSTITUTE OF ENGG. AND TECHNOLOGY",
    district: "East Godavari", district_code: "EG", region: "AU",
    fee: 76000, branches: ["CSE", "CSM", "INF", "ECE", "MEC"], baseRank: 65000,
    nba: { CSE: ["2024-04-01", "2027-03-31"] },
    naac: "NAAC A (CGPA 3.11) valid up to 15-08-2027",
  },
  {
    inst_code: "SITT", name: "SASI INSTITUTE OF TECHNOLOGY AND ENGINEERING",
    district: "West Godavari", district_code: "WG", region: "AU",
    fee: 72000, branches: ["CSE", "CSM", "INF", "ECE", "EEE"], baseRank: 38000,
    nba: { CSE: ["2023-10-01", "2026-12-31"] },
    naac: "NAAC A+ (CGPA 3.31) valid up to 20-12-2026",
  },
];

const SOURCES = [
  [1, "APSCHE AP EAPCET 2025 Last Rank Details",
    "https://cets.apsche.ap.gov.in/EAPCET/EAPCET_2025/Last_Rank_Details.aspx",
    "AP State Council of Higher Education", "cutoffs", "2025-09-02",
    "Final-phase closing ranks by college, branch, category, gender, local area"],
  [2, "G.O.Ms.No.118 APHERMC fee order (block 2023-24 to 2025-26)",
    "https://apeducation.ap.gov.in/go/ms/no-118-2025",
    "Higher Education (EC.2) Department, Government of Andhra Pradesh", "fees",
    "2025-12-24", "All-inclusive annual tuition fixed per college"],
  [3, "NBA accredited programs list", "https://www.nbaind.org/en/accredited-programs",
    "National Board of Accreditation", "accreditation", "2026-08-15",
    "Program-level NBA status with validity windows"],
  [4, "NAAC valid accreditation list (21-08-2023)", "https://www.naac.gov.in/docs/valid-list",
    "National Assessment and Accreditation Council", "accreditation", "2023-08-21",
    "Last published institution-level grade list"],
  [5, "AICTE approved institutions (2026-27)", "https://www.aicte-india.org/approved-institutions",
    "All India Council for Technical Education", "approval", "2026-07-01",
    "Approval status per institution"],
];

/* ------------------------------ generators ------------------------------ */
const usedNames = new Set(NAMED.map((n) => n.name));
const usedCodes = new Set(NAMED.map((n) => n.inst_code));

function pickBranches() {
  const others = BRANCHES.map((b) => b[0]).filter((c) => c !== "CSE");
  const set = new Set(["CSE"]);
  const extra = iBetween(2, 4);
  let guard = 0;
  while (set.size < extra + 1 && guard++ < 50) set.add(pickFrom(others));
  return [...set];
}

function generateColleges(count) {
  const out = [];
  let codeN = 1;
  let attempts = 0;
  while (out.length < count && attempts++ < count * 50) {
    const d = DISTRICTS[out.length % DISTRICTS.length];
    const name = pickFrom(PREFIXES) + " " + pickFrom(SUFFIXES);
    if (usedNames.has(name)) continue;
    usedNames.add(name);
    let code;
    do {
      code = d[0][0] + String(codeN++).padStart(3, "0");
    } while (usedCodes.has(code));
    usedCodes.add(code);
    // 188 fees total (5 named + 183 generated); the rest stay "not verified".
    const fee = out.length < 183 ? 40000 + iBetween(0, 110) * 1000 : null;
    const feeForRank = fee ?? 40000 + iBetween(0, 110) * 1000;
    const baseRank = clamp(
      Math.round(500 + ((150000 - feeForRank) / 150000) * 235000 * between(0.85, 1.25)),
      800, 240000
    );
    out.push({
      inst_code: code, name,
      district: d[1], district_code: d[0], region: d[2],
      fee, branches: pickBranches(), baseRank,
      nba: {}, naac: null,
    });
  }
  return out;
}

function cutoffRowsFor(college) {
  const areas = college.region === "SVU" ? ["SVU", "NL"] : ["AU", "NL"];
  const rows = [];
  for (const bc of college.branches) {
    for (const [cat, catF] of CATEGORIES) {
      for (const [g, gF] of GENDERS) {
        for (const area of areas) {
          const areaF = area === "NL" ? 1.15 : 1;
          const rank = clamp(
            Math.round(
              college.baseRank * BRANCH_FACTOR[bc] * catF * gF * areaF * between(0.9, 1.1)
            ),
            200, 300000
          );
          rows.push([college.inst_code, bc, cat, g, area, rank, 1]);
        }
      }
    }
  }
  return rows;
}

const NAAC_GRADES = ["A++", "A+", "A", "B++", "B+", "B", "C"];
const NBA_WINDOWS = [
  ["2021-07-01", "2024-06-30"], ["2022-07-01", "2025-06-30"],
  ["2023-07-01", "2026-06-30"], ["2024-07-01", "2027-06-30"],
  ["2025-07-01", "2028-06-30"],
];

function accreditationRows(colleges) {
  const rows = [];
  // AICTE approval for every institution (274).
  for (const c of colleges) {
    rows.push([
      c.inst_code, null, "AICTE", "approved",
      `Permanent ID 1-${iBetween(1000000, 9999999)}, approval valid for 2026-27`,
      null, "2027-03-31", 5,
    ]);
  }
  // NBA program-level rows (quota 200 incl. the pinned named-college rows)…
  let nbaCount = 0;
  for (const c of colleges) {
    nbaCount += Object.keys(c.nba).length;
  }
  for (const c of colleges) {
    for (const bc of c.branches) {
      if (nbaCount >= 200) break;
      if (c.nba[bc] || rand() >= 0.3) continue;
      const [from, to] = pickFrom(NBA_WINDOWS);
      c.nba[bc] = [from, to];
      nbaCount++;
    }
  }
  for (const c of colleges) {
    for (const [bc, [from, to]] of Object.entries(c.nba)) {
      rows.push([
        c.inst_code, bc, "NBA", "accredited",
        `NBA accreditation (Tier-${pickFrom(["I", "II"])}), program valid`,
        from, to, 3,
      ]);
    }
  }
  // …and NAAC institution-level rows (quota 105 incl. named).
  let naacCount = colleges.filter((c) => c.naac).length;
  for (const c of colleges) {
    if (naacCount >= 105) break;
    if (c.naac || rand() >= 0.42) continue;
    const grade = pickFrom(NAAC_GRADES);
    const cgpa = (between(20, 38) / 10).toFixed(2);
    const to = `20${iBetween(26, 29)}-06-30`;
    c.naac = `NAAC ${grade} (CGPA ${cgpa}) valid up to ${to.split("-").reverse().join("-")}`;
    naacCount++;
  }
  for (const c of colleges) {
    if (!c.naac) continue;
    rows.push([
      c.inst_code, null, "NAAC", "accredited", c.naac,
      null, null, 4,
    ]);
  }
  return rows;
}

/* -------------------------------- seeding ------------------------------- */
async function insertBatched(table, columns, rows, batchSize = 700) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const params = [];
    let p = 1;
    const values = chunk.map((row) => {
      const placeholders = row.map(() => "$" + p++);
      params.push(...row);
      return "(" + placeholders.join(",") + ")";
    });
    await pool.query(
      `INSERT INTO ${table} (${columns.join(",")}) VALUES ${values.join(",")}
       ON CONFLICT DO NOTHING`,
      params
    );
  }
}

async function main() {
  const started = Date.now();
  console.log("Applying db/schema.sql ...");
  await pool.query(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
  await pool.query(
    "TRUNCATE accreditations, cutoffs, fees, recommendation_runs, institutions, branches, sources RESTART IDENTITY CASCADE"
  );

  await insertBatched(
    "sources",
    ["id", "name", "url", "publisher", "doc_type", "retrieved_date", "notes"],
    SOURCES
  );
  await insertBatched("branches", ["branch_code", "name"],
    BRANCHES.map(([code, name]) => [code, name]));

  const colleges = [...NAMED, ...generateColleges(269)];
  await insertBatched(
    "institutions",
    ["inst_code", "name", "district", "district_code", "type_code", "type", "region"],
    colleges.map((c) => [c.inst_code, c.name, c.district, c.district_code, "PVT", "Private", c.region])
  );

  await insertBatched(
    "fees",
    ["inst_code", "academic_year", "tuition_per_year", "source_id"],
    colleges.filter((c) => c.fee != null).map((c) => [c.inst_code, "2025-26", c.fee, 2])
  );

  const cutoffs = colleges.flatMap(cutoffRowsFor);
  await insertBatched("cutoffs",
    ["inst_code", "branch_code", "category", "gender", "local_area", "closing_rank", "source_id"],
    cutoffs);

  const accrs = accreditationRows(colleges);
  await insertBatched("accreditations",
    ["inst_code", "branch_code", "agency", "status", "detail", "valid_from", "valid_to", "source_id"],
    accrs);

  const { rows } = await pool.query(`SELECT
    (SELECT count(*) FROM institutions)::int AS institutions,
    (SELECT count(*) FROM cutoffs)::int AS cutoffs,
    (SELECT count(*) FROM fees)::int AS fees,
    (SELECT count(*) FROM accreditations)::int AS accreditations`);
  console.log("Seed complete in %dms:", Date.now() - started, rows[0]);
}

main()
  .then(() => pool.end())
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exitCode = 1;
    return pool.end();
  });
