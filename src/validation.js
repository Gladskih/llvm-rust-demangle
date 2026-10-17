export function validateInput(input) {
  if (typeof input !== "string") return "Expected a string.";
  if (input.length === 0) return "The mangled name is empty.";
  if (!input.isWellFormed()) return "Expected well-formed Unicode without lone surrogates.";
  for (let index = 0; index < input.length; ++index) {
    if (input.charCodeAt(index) < 0x20 || input.charCodeAt(index) === 0x7f) {
      return "Expected a name without control characters or embedded NUL bytes.";
    }
  }
  return null;
}
