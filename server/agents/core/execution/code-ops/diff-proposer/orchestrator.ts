import type { DiffProposerInput, DiffProposerOutput } from "./types.js";
import { parseIntent } from "./agents/intent-parser.agent.js";
import { loadFiles } from "./agents/file-loader.agent.js";
import { parseAsts } from "./agents/ast-parser.agent.js";
import { locateEdits } from "./agents/locator.agent.js";
import { planEdits } from "./agents/edit-planner.agent.js";
import { generateDiffs } from "./agents/diff-generator.agent.js";
import { checkSafety } from "./agents/safety-checker.agent.js";
import { detectConflicts } from "./agents/conflict-detector.agent.js";
import { formatProposal } from "./agents/formatter.agent.js";
import { validateInput } from "./validators/input.validator.js";
import { validateDiffProposal } from "./validators/diff.validator.js";
import { deepFreeze } from "./utils/deep-freeze.util.js";
import { stableHash } from "./utils/hash.util.js";

export function proposeDiff(input: DiffProposerInput): Readonly<DiffProposerOutput> {
  validateInput(input);

  const intent = parseIntent(input.changeIntent);
  const files = loadFiles(input.targetFiles, intent.targetPath);
  const asts = parseAsts(files);
  const located = locateEdits(files, asts, intent);
  const plans = planEdits(files, located);
  const generated = generateDiffs(files, plans);
  const afterByPath = new Map(generated.map((entry) => [entry.filePath, entry.afterContent]));

  const safety = checkSafety(files, asts, plans, afterByPath, input.conventions?.maxEditSpanLines);
  const conflicts = detectConflicts(plans);
  const warnings = [...safety.warnings, ...conflicts];

  const proposals = generated.map((item) => {
    const patches = plans.get(item.filePath) ?? [];
    const affectedSymbols = located.filter((edit) => edit.path === item.filePath).map((edit) => edit.symbol ?? "unknown");
    const confidence = 1 - conflicts.length * 0.2 + safety.confidenceDelta;
    const proposal = formatProposal({
      filePath: item.filePath,
      patches,
      unifiedDiff: item.unifiedDiff,
      affectedSymbols,
      warnings: warnings.filter((warning) => warning.startsWith(item.filePath)),
      confidence,
    });
    validateDiffProposal(proposal);
    return proposal;
  });

  const output: DiffProposerOutput = {
    proposals,
    warnings,
    deterministicHash: stableHash({ files, intent, proposals, warnings }),
  };

  return deepFreeze(output);
}
