import path from 'node:path';
import ts from 'typescript';
import { fileSystemService } from '../../../../../../services/index.js';
import type { FileMeta, ParsedFile } from '../types.js';

export interface AstParserInput {
  readonly rootPath: string;
  readonly files: readonly FileMeta[];
}

const SCRIPT_KIND_BY_EXT: Readonly<Record<string, ts.ScriptKind>> = {
  '.ts': ts.ScriptKind.TS,
  '.tsx': ts.ScriptKind.TSX,
  '.js': ts.ScriptKind.JS,
  '.jsx': ts.ScriptKind.JSX,
  '.mjs': ts.ScriptKind.JS,
  '.cjs': ts.ScriptKind.JS,
};

export async function parseFilesToAst(input: AstParserInput): Promise<readonly ParsedFile[]> {
  const parsedFiles = await Promise.all(
    input.files.map(async (file) => {
      const absolutePath = path.join(input.rootPath, file.path);
      const sourceText = await fileSystemService.readFile(absolutePath, 'utf8');
      const scriptKind = SCRIPT_KIND_BY_EXT[file.extension] ?? ts.ScriptKind.Unknown;
      const ast = ts.createSourceFile(file.path, sourceText, ts.ScriptTarget.Latest, true, scriptKind);

      return {
        file,
        sourceText,
        ast,
      } satisfies ParsedFile;
    }),
  );

  return Object.freeze(parsedFiles);
}
