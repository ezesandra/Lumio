import path from "path";

export async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".pdf":
      return extractFromPDF(filePath);
    case ".docx":
      return extractFromDOCX(filePath);
    case ".pptx":
      return extractFromPPTX(filePath);
    case ".txt":
      return extractFromTXT(filePath);
    default:
      throw new Error(`Unsupported file format: ${ext}`);
  }
}

async function extractFromPDF(filePath: string): Promise<string> {
  const fs = await import("fs/promises");
  const { PDFParse } = await import("pdf-parse");
  const buffer = await fs.readFile(filePath);
  const pdf = new PDFParse({ data: buffer });
  const result = await pdf.getText();
  return result.text;
}

async function extractFromDOCX(filePath: string): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

async function extractFromPPTX(filePath: string): Promise<string> {
  const { parseOffice } = await import("officeparser");
  const ast = await parseOffice(filePath);
  return ast.toText();
}

async function extractFromTXT(filePath: string): Promise<string> {
  const fs = await import("fs/promises");
  return fs.readFile(filePath, "utf-8");
}
