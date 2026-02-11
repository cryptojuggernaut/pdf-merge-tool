import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";

const MAX_FILES = 20;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files");

    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: "Too many files" }, { status: 400 });
    }

    let total = 0;
    const merged = await PDFDocument.create();

    for (const f of files) {
      if (!(f instanceof File)) continue;
      if (f.type !== "application/pdf") {
        return NextResponse.json({ error: "Only PDFs allowed" }, { status: 400 });
      }

      total += f.size;
      if (total > MAX_TOTAL_BYTES) {
        return NextResponse.json({ error: "Files too large" }, { status: 413 });
      }

      const bytes = new Uint8Array(await f.arrayBuffer());
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await merged.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }

    const out = await merged.save();

    return new NextResponse(out, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="merged.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Merge failed" }, { status: 500 });
  }
}
