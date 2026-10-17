import assert from "node:assert/strict";
import { test } from "node:test";
import { validateInput } from "../dist/validation.js";

test("validates text without interpreting mangling syntax", () => {
  assert.equal(validateInput("?f@@YAHH@Z"), null);
  assert.equal(validateInput(".?AVWidget@demo@@"), null);
  assert.equal(validateInput("invalid"), null);
});

test("reports malformed input without throwing", () => {
  assert.match(validateInput(null), /string/);
  assert.match(validateInput(1), /string/);
  assert.match(validateInput(""), /empty/);
  assert.match(validateInput("a\0b"), /control|NUL|Unicode/);
  assert.equal(validateInput("π😊"), null);
  assert.match(validateInput("\u007f"), /control/);
  assert.match(validateInput("\ud800"), /control|NUL|Unicode/);
  assert.match(validateInput("\n"), /control|NUL|Unicode/);
  assert.equal(validateInput("x".repeat(1048577)), null);
  assert.equal(validateInput(" ~"), null);
});
