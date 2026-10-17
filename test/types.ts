import { createDemangler, type DemangleResult, type AstNode } from "../dist/node.js";
const api = await createDemangler();
const result: DemangleResult = api.demangle("_RNvC1a4main");
if (result.status === "success") {
  const node: AstNode = result.ast.nodes[result.ast.root];
  node.children.forEach(index => index.toFixed());
}
const formatted = api.demangleWithText("_RNvC1a4main");
if (formatted.status === "success") formatted.text.toUpperCase();
// @ts-expect-error input must be a string
api.demangle(1);
// @ts-expect-error analysis does not contain presentation
result.text;
