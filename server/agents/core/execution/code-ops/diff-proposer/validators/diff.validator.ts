import type { DiffProposal } from "../types.js";
import { DiffProposerError } from "../utils/error.util.js";

export function validateDiffProposal(proposal: DiffProposal): void {
  if (!proposal.filePath) {
    throw new DiffProposerError("INVALID_PROPOSAL", "filePath is required.");
  }
  if (!Array.isArray(proposal.patches)) {
    throw new DiffProposerError("INVALID_PROPOSAL", "patches must be an array.");
  }
  if (typeof proposal.unifiedDiff !== "string") {
    throw new DiffProposerError("INVALID_PROPOSAL", "unifiedDiff must be a string.");
  }
  if (proposal.confidence < 0 || proposal.confidence > 1) {
    throw new DiffProposerError("INVALID_CONFIDENCE", "confidence must be between 0 and 1.");
  }

  for (const patch of proposal.patches) {
    if (patch.range.start > patch.range.end) {
      throw new DiffProposerError("INVALID_RANGE", `Invalid range in ${proposal.filePath}.`);
    }
  }
}
