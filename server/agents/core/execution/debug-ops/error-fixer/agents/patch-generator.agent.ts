import type { ErrorReport, FixStrategy, Patch, RootCause } from "../types.js";
import { readTargetFile } from "../utils/file-locator.util.js";
import { buildSimpleDiff } from "../utils/diff-builder.util.js";

let _patchCounter = 0;

function nextPatchId(): string {
  _patchCounter += 1;
  return `patch-${Date.now()}-${String(_patchCounter).padStart(4, "0")}`;
}

function repairModuleImport(content: string): string {
  return content
    .replace(/from\s+(["'][^"']+)\.ts(["'])/g, "from $1.js$2")
    .replace(/import\((['"][^"']+)\.ts(['"])\)/g, "import($1.js$2)");
}

function repairConflictMarkers(content: string): string {
  return content
    .replace(/^<{7}.*$/gm, "")
    .replace(/^={7}$/gm, "")
    .replace(/^>{7}.*$/gm, "")
    .replace(/\n{3,}/g, "\n\n");
}

export async function generatePatch(
  strategy: FixStrategy,
  rootCause: RootCause,
  detectedErrors: readonly ErrorReport[],
  projectRoot: string,
): Promise<readonly Patch[]> {
  if (!strategy.targetFile || strategy.action === "NOOP") {
    return Object.freeze([]);
  }

  try {
    const before = await readTargetFile(projectRoot, strategy.targetFile);
    let after = before;

    if (strategy.action === "ADD_IMPORT") {
      after = repairModuleImport(after);
    }

    if (strategy.action === "UPDATE_FILE") {
      after = repairConflictMarkers(after);
    }

    if (before === after) {
      const message = detectedErrors[0]?.message ?? "unknown error";
      after = `${before}\n// auto-fix note: ${rootCause.summary} | ${message}\n`;
    }

    const patch: Patch = Object.freeze({
      id: nextPatchId(),
      filePath: strategy.targetFile,
      before,
      after,
      diff: buildSimpleDiff(strategy.targetFile, before, after),
    });

    return Object.freeze([patch]);
  } catch {
    return Object.freeze([]);
  }
}
