import assert from "node:assert/strict";
import { test } from "node:test";
import { transformFunction, replaceOnce, assertRuleTags, removeFunction } from "../scripts/cpp-function.mjs";

test("finds a C++ body through strings, raw strings, comments and nested blocks", () => {
  const source = "void rule() { /* } */ auto text = R\"tag({})tag\"; if (x) { f(\"}\"); } } trailing";
  assert.equal(transformFunction(source, "void rule()", body => body + " captured;"),
    source.replace("} trailing", " captured;} trailing"));
});

test("fails closed on missing, repeated or truncated insertion points", () => {
  assert.throws(() => transformFunction("", "void rule()", String));
  assert.throws(() => transformFunction("void rule() {} void rule() {}", "void rule()", String));
  assert.throws(() => transformFunction("void rule() {", "void rule()", String));
  assert.throws(() => replaceOnce("same same", "same", "changed"));
  assert.equal(replaceOnce("before", "before", "after"), "after");
});

test("rejects unreviewed grammar tag changes", () => {
  assertRuleTags("void rule() { switch(tag) { case 'C': break; } }", "void rule()", ["C"]);
  assert.throws(() => assertRuleTags("void rule() { case 'D': break; }", "void rule()", ["C"]));
});

test("removes the replaced upstream entry and rejects declarations without bodies", () => {
  assert.equal(removeFunction("before void rule() { call(); } after", "void rule()"), "before  after");
  assert.throws(() => transformFunction("void rule(); void other() {}", "void rule()", String));
});
