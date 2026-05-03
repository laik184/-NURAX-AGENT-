export type PatchType = "add" | "update" | "delete";

export interface TextRange {
  start: number;
  end: number;
}

export interface TargetFile {
  path: string;
  content: string;
}

export interface ChangeIntent {
  action: string;
  details?: Record<string, unknown>;
  target?: {
    path?: string;
    symbol?: string;
  };
}

export interface DiffConventions {
  lineEnding?: "lf" | "crlf";
  indent?: string;
  maxEditSpanLines?: number;
}

export interface DiffProposerInput {
  targetFiles: TargetFile[];
  changeIntent: ChangeIntent;
  conventions?: DiffConventions;
}

export interface ParsedIntent {
  action: string;
  targetPath?: string;
  targetSymbol?: string;
  operations: ReadonlyArray<IntentOperation>;
}

export interface IntentOperation {
  kind: "replace" | "insert_after" | "insert_before" | "append" | "prepend" | "delete" | "range_replace";
  match?: string;
  content?: string;
  range?: TextRange;
}

export interface FileEnvelope {
  path: string;
  content: string;
  lines: ReadonlyArray<string>;
}

export interface AstEnvelope {
  path: string;
  syntaxSupported: boolean;
  syntaxValid: boolean;
  symbols: ReadonlyArray<string>;
}

export interface LocatedEdit {
  path: string;
  type: PatchType;
  range: TextRange;
  content: string;
  symbol?: string;
}

export interface DiffPatch {
  type: PatchType;
  range: TextRange;
  content: string;
}

export interface DiffProposal {
  filePath: string;
  patches: ReadonlyArray<DiffPatch>;
  unifiedDiff: string;
  affectedSymbols: ReadonlyArray<string>;
  warnings: ReadonlyArray<string>;
  confidence: number;
  generatedAt: string;
}

export interface DiffProposerOutput {
  proposals: ReadonlyArray<DiffProposal>;
  warnings: ReadonlyArray<string>;
  deterministicHash: string;
}
