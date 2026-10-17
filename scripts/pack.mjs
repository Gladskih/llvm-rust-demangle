import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { npmCommand } from "./npm-command.mjs";

execFileSync(process.execPath, ["scripts/verify-package.mjs"], { stdio: "inherit" });
const [command, ...prefix] = npmCommand();
const output = execFileSync(command, [...prefix, "pack", "--ignore-scripts", "--json"]);
const pack = JSON.parse(output)[0];
await writeFile("pack-result.json", output);
await writeFile("package.sha256", `${createHash("sha256").update(await readFile(pack.filename))
  .digest("hex")}  ${pack.filename}\n`);
execFileSync(process.execPath, ["scripts/test-tarball.mjs"], { stdio: "inherit" });
