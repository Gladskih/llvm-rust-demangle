import { readFile, writeFile } from "node:fs/promises";

// Literal expected text from the pinned upstream tests, never from our parser.
const literal = /"(?:[^"\\]|\\.)*"/g;
const decode = text => JSON.parse(text);
const unit = await readFile(".build/llvm/llvm/unittests/Demangle/RustDemangleTest.cpp", "utf8");
const lit = await readFile(".build/llvm/llvm/test/Demangle/rust.test", "utf8");
const cases = [];
for (const match of unit.matchAll(/std::make_pair\(([\s\S]*?)\)/g)) {
  const strings = match[1].match(literal) ?? [];
  if (strings.length >= 2) cases.push([decode(strings[0]), decode(strings[1])]);
  else if (strings.length === 1 && match[1].includes("nullptr")) cases.push([decode(strings[0]), null]);
}
for (const match of lit.matchAll(/^CHECK: (.*)\r?\n\s+(_\S+)/gm)) {
  cases.push([match[2], match[1] === match[2] ? null : match[1]]);
}
if (cases.length === 0) throw new Error("No upstream cases extracted");
await writeFile(".build/cases.json", JSON.stringify(cases));
const names = new Set(cases.map(([input]) => input));
for (const [input] of cases) {
  for (let length = 1; length < input.length; ++length) names.add(input.slice(0, length));
  for (let index = 0; index < input.length; ++index) {
    names.add(input.slice(0, index) + "?" + input.slice(index + 1));
  }
}
for (const input of ["_D", "_R", "_D4294967296aZ", "_D18446744073709551617aZ",
  "_RB_", "_RB999999999999999999999_", "_RC999999999999999999999_a"]) names.add(input);
await writeFile(".build/fuzz.txt", [...names].join("\n") + "\n");
console.warn("Upstream cases: " + cases.length + "; malformed corpus: " + names.size);
