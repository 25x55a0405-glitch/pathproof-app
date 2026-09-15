import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  // Common mislabeled types: browsers may send empty or generic MIME types.
  const name = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
  const isText = file.type === "text/plain" || name.endsWith(".txt");

  if (isText) {
    try {
      const text = await file.text();
      return NextResponse.json({ text: text.slice(0, 20000) });
    } catch {
      return NextResponse.json({ error: "read_failed" }, { status: 400 });
    }
  }

  if (isPdf) {
    try {
      const { extractTextFromPdf } = await import("@/lib/pdf");
      const text = await extractTextFromPdf(file);
      if (!text.trim()) {
        // Scanned/image-only PDFs contain no extractable text layer.
        return NextResponse.json(
          { error: "no_text_layer" },
          { status: 422 }
        );
      }
      return NextResponse.json({ text });
    } catch (e) {
      console.error("pdf extract failed", e);
      return NextResponse.json({ error: "pdf_parse_failed" }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
}
