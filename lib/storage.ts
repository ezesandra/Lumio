import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function saveFile(buffer: Buffer, fileName: string): Promise<{ filePath: string; fileHash: string }> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const ext = path.extname(fileName);
  const storedName = `${hash}${ext}`;
  const filePath = path.join(UPLOADS_DIR, storedName);

  await fs.writeFile(filePath, buffer);

  return { filePath, fileHash: hash };
}

export function getFileUrl(filePath: string): string {
  const relativePath = path.relative(process.cwd(), filePath);
  return `/api/files/${path.basename(filePath)}`;
}
