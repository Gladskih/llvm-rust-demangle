export interface Ast {
  root: number;
  nodes: AstNode[];
}

export type DemangleResult =
  | { status: "success"; ast: Ast; warnings: string[] }
  | { status: "invalid" | "limit" | "error"; ast: null; warnings: string[] };

export type DemangleWithTextResult =
  | (Extract<DemangleResult, { status: "success" }> & { text: string })
  | (Exclude<DemangleResult, { status: "success" }> & { text: null });

export interface Demangler {
  /** Capture LLVM grammar and semantic values without building presentation text. */
  demangle(input: string): DemangleResult;
  /** Capture the same tree and LLVM presentation in one parser traversal. */
  demangleWithText(input: string): DemangleWithTextResult;
}

export interface DemanglerConfiguration {
  wasmBinary?: Uint8Array;
  wasmURL?: string | URL;
}

export function createDemangler(configuration?: DemanglerConfiguration): Promise<Demangler>;
