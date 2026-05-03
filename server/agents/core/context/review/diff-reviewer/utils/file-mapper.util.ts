import type { ImpactedFile } from "../types.js";

function toDirectory(filePath: string): string {
  const idx = filePath.lastIndexOf("/");
  return idx >= 0 ? filePath.slice(0, idx) : "";
}

export function mapImpactedFiles(changedFiles: readonly string[]): readonly ImpactedFile[] {
  const impacts: ImpactedFile[] = [];

  for (const file of changedFiles) {
    const dir = toDirectory(file);
    if (!dir) continue;

    impacts.push({
      sourceFile: file,
      impactedFile: `${dir}/index.ts`,
      reason: "Directory barrel export may need update.",
    });

    impacts.push({
      sourceFile: file,
      impactedFile: `${dir}/replit.md`,
      reason: "Module documentation may need sync.",
    });
  }

  return Object.freeze(impacts);
}
