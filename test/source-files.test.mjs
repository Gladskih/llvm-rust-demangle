import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { download, ensureSource, sha256 } from "../scripts/source-files.mjs";

async function directory(context) {
  const path = await mkdtemp(join(tmpdir(), "demangle-sources-"));
  context.after(() => rm(path, { recursive: true, force: true }));
  return pathToFileURL(`${path}/`);
}

test("uses the standard SHA-256 digest", () => {
  assert.equal(sha256(Buffer.alloc(0)),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});

test("downloads bytes and rejects HTTP failures", async context => {
  context.mock.method(globalThis, "fetch", async () => new Response("source"));
  assert.deepEqual(await download("https://example.invalid/source"), Buffer.from("source"));
  context.mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
  await assert.rejects(download("https://example.invalid/source"), /503/);
});

test("downloads missing or altered files and reuses verified sources", async context => {
  const root = await directory(context);
  const fetch = context.mock.method(globalThis, "fetch", async () => new Response("source"));
  await ensureSource(root, "pinned-commit", "dir/source.h", sha256("source"));
  assert.equal(await readFile(new URL("dir/source.h", root), "utf8"), "source");
  await ensureSource(root, "pinned-commit", "dir/source.h", sha256("source"));
  assert.equal(fetch.mock.callCount(), 1);
  await writeFile(new URL("dir/source.h", root), "modified");
  await ensureSource(root, "pinned-commit", "dir/source.h", sha256("source"));
  assert.equal(fetch.mock.callCount(), 2);
});

test("refuses a source checksum mismatch without writing the file", async context => {
  const root = await directory(context);
  context.mock.method(globalThis, "fetch", async () => new Response("tampered"));
  await assert.rejects(ensureSource(root, "pinned-commit", "source.h", sha256("source")),
    /checksum mismatch/);
  await assert.rejects(readFile(new URL("source.h", root)), /ENOENT/);
});
