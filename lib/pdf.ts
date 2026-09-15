export async function extractTextFromPdf(file: File): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const buf = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: buf });
  try {
    const result = await parser.getText();
    return (result.text ?? "").slice(0, 20000);
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
