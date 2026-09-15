"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import type { Category, Gender, LocalArea, Profile } from "@/lib/types";

const CATEGORIES: { code: Category; label: string }[] = [
  { code: "OC", label: "OC (Open)" },
  { code: "EWS", label: "EWS" },
  { code: "SC1", label: "SC Group-I" },
  { code: "SC2", label: "SC Group-II" },
  { code: "SC3", label: "SC Group-III" },
  { code: "ST", label: "ST" },
  { code: "BCA", label: "BC-A" },
  { code: "BCB", label: "BC-B" },
  { code: "BCC", label: "BC-C" },
  { code: "BCD", label: "BC-D" },
  { code: "BCE", label: "BC-E" },
];

const DISTRICTS: [string, string][] = [
  ["", "Not saying"], ["EG", "East Godavari"], ["WG", "West Godavari"], ["KRI", "Krishna"],
  ["GTR", "Guntur"], ["PKS", "Prakasam"], ["NLR", "Nellore"], ["VSP", "Visakhapatnam"],
  ["VZM", "Vizianagaram"], ["SKL", "Srikakulam"], ["ATP", "Anantapur"], ["KNL", "Kurnool"],
  ["CTR", "Chittoor"], ["KDP", "Kadapa"],
];

const BRANCHES: { code: string; label: string }[] = [
  { code: "CSE", label: "Computer Science" },
  { code: "CSM", label: "CSE (AI & ML)" },
  { code: "CSD", label: "CSE (Data Science)" },
  { code: "CSC", label: "CSE (Cyber Security)" },
  { code: "CAI", label: "CSE (Artificial Intelligence)" },
  { code: "AID", label: "AI & Data Science" },
  { code: "INF", label: "Information Technology" },
  { code: "ECE", label: "Electronics & Communication" },
  { code: "EEE", label: "Electrical & Electronics" },
  { code: "MEC", label: "Mechanical" },
  { code: "CIV", label: "Civil" },
  { code: "CHE", label: "Chemical" },
];

const STEPS = ["Rank", "Category", "Branch & budget", "Priorities"];

export default function StartPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [rank, setRank] = useState("");
  const [category, setCategory] = useState<Category>("OC");
  const [gender, setGender] = useState<Gender>("M");
  const [localArea, setLocalArea] = useState<LocalArea>("AU");
  const [branches, setBranches] = useState<string[]>(["CSE"]);
  const [budget, setBudget] = useState(80000);
  const [homeDistrict, setHomeDistrict] = useState("");
  const [wCost, setWCost] = useState(0.8);
  const [wProx, setWProx] = useState(0.4);
  const [wAccr, setWAccr] = useState(0.6);
  const [error, setError] = useState<string | null>(null);

  const rankOk = Number(rank) > 0 && Number(rank) <= 300000;

  function next() {
    if (step === 0 && !rankOk) {
      setError("Enter your AP EAPCET rank (1 - 3,00,000).");
      return;
    }
    setError(null);
    if (step === 2 && branches.length === 0) {
      setError("Pick at least one branch.");
      return;
    }
    setStep((s) => s + 1);
  }

  function finish() {
    if (!rankOk) {
      setError("Enter your AP EAPCET rank (1 - 3,00,000).");
      setStep(0);
      return;
    }
    const profile: Profile = {
      rank: Number(rank),
      category,
      gender,
      localArea,
      branches,
      budgetMax: budget,
      homeDistrict: homeDistrict || null,
      hostel: false,
      weights: { cost: wCost, branch: 1, proximity: wProx, accreditation: wAccr },
    };
    try {
      sessionStorage.setItem("pathproof.profile", JSON.stringify(profile));
    } catch {
      setError("Browser storage is unavailable. Enable cookies/site data and try again.");
      return;
    }
    router.push("/upload");
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <div className="mb-8 flex items-center gap-2 text-[13px] text-muted">
        {STEPS.map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            <span className={i === step ? "font-semibold text-ink" : ""}>{s}</span>
            {i < STEPS.length - 1 && <span className="text-line">/</span>}
          </span>
        ))}
      </div>

      {step === 0 && (
        <section>
          <h1 className="text-3xl font-semibold tracking-tight">Your AP EAPCET rank</h1>
          <p className="mt-2 text-sm text-muted">
            From your rank card. We never share it and never sell it.
          </p>
          <input
            type="number"
            inputMode="numeric"
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            placeholder="e.g. 48000"
            className="num mt-6 w-full rounded-xl border border-line bg-card px-4 py-3.5 text-lg outline-none focus:border-accent"
          />
        </section>
      )}

      {step === 1 && (
        <section>
          <h1 className="text-3xl font-semibold tracking-tight">Category, gender, local area</h1>
          <p className="mt-2 text-sm text-muted">
            The official last-rank list is published in exactly these three slices. This is how the
            band gets personal.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.code}
                onClick={() => setCategory(c.code)}
                className={
                  "rounded-full border px-3.5 py-1.5 text-[13px] " +
                  (category === c.code
                    ? "border-ink bg-ink text-paper"
                    : "border-line bg-card text-muted hover:border-accent")
                }
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-muted">Gender</span>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="mt-1 w-full rounded-xl border border-line bg-card px-3.5 py-2.5 outline-none focus:border-accent"
              >
                <option value="M">Boys</option>
                <option value="F">Girls</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-muted">Local area</span>
              <select
                value={localArea}
                onChange={(e) => setLocalArea(e.target.value as LocalArea)}
                className="mt-1 w-full rounded-xl border border-line bg-card px-3.5 py-2.5 outline-none focus:border-accent"
              >
                <option value="AU">AU region (Andhra University area)</option>
                <option value="SVU">SVU region (Sri Venkateswara area)</option>
                <option value="NL">Not sure</option>
              </select>
            </label>
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h1 className="text-3xl font-semibold tracking-tight">Branches and budget</h1>
          <p className="mt-2 text-sm text-muted">
            Hard filters, not preferences: anything outside this never appears, whatever its ranking.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {BRANCHES.map((b) => (
              <button
                key={b.code}
                onClick={() =>
                  setBranches((prev) =>
                    prev.includes(b.code) ? prev.filter((x) => x !== b.code) : [...prev, b.code]
                  )
                }
                className={
                  "rounded-full border px-3.5 py-1.5 text-[13px] " +
                  (branches.includes(b.code)
                    ? "border-ink bg-ink text-paper"
                    : "border-line bg-card text-muted hover:border-accent")
                }
              >
                {b.label}
              </button>
            ))}
          </div>
          <div className="mt-8">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted">Maximum all-inclusive annual fee</span>
              <span className="num font-semibold">₹{budget.toLocaleString("en-IN")}</span>
            </div>
            <input
              type="range"
              min={40000}
              max={160000}
              step={1000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="mt-3 w-full accent-[#0e7a6c]"
            />
            <p className="mt-2 text-[12px] text-muted">
              Official fees are all-inclusive (tuition + affiliation + exam + development), per
              G.O.Ms.No.118. Hostel and transport are separate.
            </p>
          </div>
          <label className="mt-6 block text-sm">
            <span className="text-muted">Home district (optional)</span>
            <select
              value={homeDistrict}
              onChange={(e) => setHomeDistrict(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-card px-3.5 py-2.5 outline-none focus:border-accent"
            >
              {DISTRICTS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
        </section>
      )}

      {step === 3 && (
        <section>
          <h1 className="text-3xl font-semibold tracking-tight">What matters most?</h1>
          <p className="mt-2 text-sm text-muted">
            These sliders feed the ranking engine. Move them anytime later — the shortlist
            recomputes instantly.
          </p>
          <div className="mt-8 space-y-7">
            <Slider label="Cost matters" hint="cheaper colleges score higher" value={wCost} set={setWCost} />
            <Slider label="Stay close to home" hint="same-district colleges score higher" value={wProx} set={setWProx} />
            <Slider label="Accreditation matters" hint="NBA/NAAC evidence scores higher" value={wAccr} set={setWAccr} />
          </div>
        </section>
      )}

      {error && <p className="mt-5 text-sm text-contradicted">{error}</p>}

      <div className="mt-10 flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className={"btn btn-ghost " + (step === 0 ? "invisible" : "")}
        >
          Back
        </button>
        {step < 3 ? (
          <button onClick={next} className="btn btn-primary">Continue</button>
        ) : (
          <button onClick={finish} className="btn btn-primary">Continue to upload</button>
        )}
      </div>
      <p className="mt-6 text-[12px] text-muted">
        Just exploring?{" "}
        <Link href="/colleges" className="underline hover:text-accent">
          Browse the verified college database
        </Link>{" "}
        without a profile.
      </p>
    </div>
  );
}

function Slider({
  label,
  hint,
  value,
  set,
}: {
  label: string;
  hint: string;
  value: number;
  set: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-[12px] text-muted">{hint}</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.1}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="mt-2 w-full accent-[#0e7a6c]"
      />
    </div>
  );
}
