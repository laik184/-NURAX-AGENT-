import fs from "node:fs";
import path from "node:path";

export function writeGeneratedTestFile(baseOutputDir: string, fileName: string, content: string): string {
  const outputDir = path.resolve(baseOutputDir);
  fs.mkdirSync(outputDir, { recursive: true });

  const filePath = path.join(outputDir, fileName);
  fs.writeFileSync(filePath, content, "utf-8");

  return filePath;
}
