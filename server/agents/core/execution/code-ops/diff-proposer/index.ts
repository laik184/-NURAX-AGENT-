import type { DiffProposerInput, DiffProposerOutput } from "./types.js";
import { proposeDiff } from "./orchestrator.js";

export function runDiffProposer(input: DiffProposerInput): Readonly<DiffProposerOutput> {
  return proposeDiff(input);
}

export type {
  ChangeIntent,
  DiffConventions,
  DiffPatch,
  DiffProposal,
  DiffProposerInput,
  DiffProposerOutput,
  PatchType,
  TargetFile,
  TextRange,
} from "./types.js";
