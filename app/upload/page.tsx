"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { DEMO_TEXT } from "@/lib/demo-text";

export default function UploadPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function readPdf(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/extract-pdf", { method: "POST", body: form });
    if (!res.ok) throw new Error("Could not read that PDF");
    const j = (await res.json()) as { text: string };
    return j.text;
  }

  async function go() {
    setError(null);
    if (!text.trim()) {
      setError("Paste the counselor's message or upload a file first.");
      return;
    }
    setBusy(true);
    try {
      sessionStorage.setItem("pathproof.counselorText", text.trim());
      router.push("/report");
    } catch {
      setBusy(false);
      setError("Browser storage is unavailable. Enable cookies/site data and try again.");
    }
  }

  async function onFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const t = await readPdf(file);
        setText((prev) => (prev ? prev + "\n\n" : "") + t.slice(0, 8000));
        setFileName(file.name);
      } else if (file.type.startsWith("image/")) {
        setError(
          "Images need the AI vision model. Connect an LLM key in .env, or paste the message text for now."
        );
      } else {
        const t = await file.text();
        setText((prev) => (prev ? prev + "\n\n" : "") + t.slice(0, 8000));
        setFileName(file.name);
      }
    } catch {
      setError("Could not read that file. Paste the text instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <h1 className="text-3xl font-semibold tracking-tight">What did the counselor send you?</h1>
      <p className="mt-2 text-sm text-muted">
        A WhatsApp screenshot, a PDF brochure, or just the list pasted as text. Only the text is
        analyzed — nothing is stored against you.
      </p>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) void onFile(f);
        }}
        className="mt-6 rounded-2xl border border-dashed border-line bg-card p-8 text-center"
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain,image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />
        <p className="text-sm font-medium">Drop a PDF or text file here</p>
        <p className="mt-1 text-[13px] text-muted">
          or{" "}
          <button className="underline hover:text-accent" onClick={() => fileRef.current?.click()}>
            choose a file
          </button>{" "}
          ·{" "}
          <button
            className="underline hover:text-accent"
            onClick={() => {
              setText(DEMO_TEXT);
              setFileName("demo-counselor-message.txt");
            }}
          >
            use the sample message
          </button>
        </p>
        {fileName && <p className="mt-3 text-[12px] text-accent">Added: {fileName}</p>}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={9}
        placeholder={"Or paste the message here…\n\ne.g. \u201CBest option for 48000 rank: PVP Siddhartha CSE, fee 1,05,000, 100% placement, NBA accredited…\u201D"}
        className="mt-5 w-full rounded-2xl border border-line bg-card px-4 py-3.5 text-[14px] leading-relaxed outline-none focus:border-accent"
      />

      {error && <p className="mt-4 text-sm text-contradicted">{error}</p>}

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => {
            setText("");
            setFileName(null);
          }}
          className="btn btn-ghost"
        >
          Clear
        </button>
        <button onClick={go} disabled={busy} className="btn btn-primary">
          {busy ? "Reading…" : "Run the audit"}
        </button>
      </div>
    </div>
  );
}
