import { createDemangler, type DemangleResult } from "../dist/node.js";
const api = await createDemangler();
const result: DemangleResult = api.demangle("_RNvC1a4main");
if (result.status === "success") result.text.toUpperCase();
else result.warnings.forEach(warning => warning.toUpperCase());
// @ts-expect-error inputs must be strings
api.demangle(1);
// @ts-expect-error upstream provides no AST
result.ast;
