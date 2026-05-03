import type { GeneratedRoute, SupportedFramework } from "../types";
import { formatExpressRoutesFile, formatNestControllerFile } from "../utils/formatter.util";

export interface FileWriterPort {
  write(filePath: string, content: string): Promise<void>;
}

export interface RouteWriterResult {
  files: string[];
  contentByFile: Record<string, string>;
}

export const writeRoutes = async (
  framework: SupportedFramework,
  routes: GeneratedRoute[],
  fileWriter?: FileWriterPort,
  outputDir = "generated",
): Promise<RouteWriterResult> => {
  const fileName = framework === "express" ? "routes.ts" : "generated-routes.controller.ts";
  const filePath = `${outputDir}/${framework}/${fileName}`;

  const content =
    framework === "express"
      ? formatExpressRoutesFile(routes)
      : formatNestControllerFile(routes);

  if (fileWriter) {
    await fileWriter.write(filePath, content);
  }

  return {
    files: [filePath],
    contentByFile: {
      [filePath]: content,
    },
  };
};
