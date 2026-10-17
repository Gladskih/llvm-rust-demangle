import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

export async function ensureSource(root, pin, path, expected) {
  const destination = new URL(path, root);
  const existing = await readFile(destination).catch(() => null);
  if (existing && sha256(existing) === expected) return;
  const bytes = await download(`https://raw.githubusercontent.com/llvm/llvm-project/${pin}/${path}`);
  if (sha256(bytes) !== expected) throw new Error(`Source checksum mismatch: ${path}`);
  await mkdir(new URL("./", destination), { recursive: true });
  await writeFile(destination, bytes);
}
