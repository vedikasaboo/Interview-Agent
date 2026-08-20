import { PDFParse } from "pdf-parse";

// pdf-parse 2.x (class API): `new PDFParse({ data }).getText()`. The 1.x
// broken-debug-import bug (and its `lib/pdf-parse.js` workaround) don't exist
// in 2.x — it ships proper `exports`, so the bare import resolves correctly.

// Real PDFs start with the %PDF- signature; guards against a spoofed
// extension/MIME slipping a non-PDF past multer's MIME check.
export function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    // pdfjs holds worker resources — always release them.
    await parser.destroy();
  }
}
