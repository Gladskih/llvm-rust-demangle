export type DemangleResult =
  | { status: "success"; text: string; warnings: string[] }
  | { status: "invalid" | "limit" | "error"; text: null; warnings: string[] };

export interface Demangler {
  demangle(input: string): DemangleResult;
}

export interface DemanglerConfiguration {
  wasmBinary?: Uint8Array;
  wasmURL?: string | URL;
}

export function createDemangler(configuration?: DemanglerConfiguration): Promise<Demangler>;
