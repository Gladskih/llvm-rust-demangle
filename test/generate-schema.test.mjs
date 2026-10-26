import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const schema = JSON.parse(await readFile("dist/ast-schema.json"));
const declarations = await readFile("dist/index.d.ts", "utf8");
const pin = JSON.parse(await readFile("upstream.json"));

test("publishes the revision-scoped grammar schema and concrete TypeScript union", () => {
  assert.match(schema.llvmCommit, /^[a-f0-9]{40}$/);
  assert.equal(schema.llvmCommit, pin.llvmCommit);
  assert.deepEqual(schema.required, ["root", "nodes"]);
  const symbol = schema.properties.nodes.items.oneOf.find(item =>
    item.properties.kind.const === "Symbol");
  assert.deepEqual(symbol.required, ["kind", "start", "end", "children"]);
  assert.equal(symbol.additionalProperties, false);
  assert.match(declarations, /kind: "Symbol"/);
  assert.match(declarations,
    /demangleWithText\(input: string\): (?:Promise|DemangleWithTextResult)/);
});

test("regenerates the schema revision when the upstream pin changes", async context => {
  const root = await mkdtemp(join(tmpdir(), "demangle-schema-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "scripts"));
  await copyFile("scripts/grammar-nodes.json", join(root, "scripts/grammar-nodes.json"));
  const generator = new URL("../scripts/generate-schema.mjs", import.meta.url).href;
  for (const llvmCommit of ["1".repeat(40), "2".repeat(40)]) {
    await writeFile(join(root, "upstream.json"), JSON.stringify({ llvmCommit }));
    execFileSync(process.execPath, ["--input-type=module", "-e",
      `import { generateSchema } from ${JSON.stringify(generator)}; await generateSchema();`],
    { cwd: root });
    const generated = JSON.parse(await readFile(join(root, "artifacts/ast-schema.json")));
    assert.equal(generated.llvmCommit, llvmCommit);
  }
});
