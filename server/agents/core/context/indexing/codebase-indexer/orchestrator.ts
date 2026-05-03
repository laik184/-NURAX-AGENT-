import { parseFilesToAst } from './agents/ast-parser.agent.js';
import { mapDependencies } from './agents/dependency-mapper.agent.js';
import { generateEmbeddings } from './agents/embedding-generator.agent.js';
import { scanRepositoryFiles } from './agents/file-scanner.agent.js';
import { buildSearchableIndex } from './agents/index-builder.agent.js';
import { extractSymbols } from './agents/symbol-extractor.agent.js';
import { getIndexerState, setIndexerState } from './state.js';
import type { DependencyGraph, IndexResult, SearchableIndex } from './types.js';
import { pushError, pushLog } from './utils/logger.util.js';
import { resolveRootPath } from './utils/path-resolver.util.js';

export interface BuildIndexInput {
  readonly rootPath?: string;
}

export async function runCodebaseIndexing(input: BuildIndexInput = {}): Promise<IndexResult> {
  const logs: string[] = [];
  const errors: string[] = [];

  try {
    const rootPath = resolveRootPath(input.rootPath);
    const previousState = getIndexerState();
    const previousHashes = Object.freeze(
      previousState.files.reduce<Record<string, string>>((acc, file) => {
        acc[file.path] = file.hash;
        return acc;
      }, {}),
    );

    setIndexerState({ status: 'SCANNING', logs: [...logs], errors: [...errors] });
    pushLog(logs, `orchestrator:start root=${rootPath}`);

    const files = await scanRepositoryFiles({ rootPath, previousHashes });
    pushLog(logs, `file-scanner:files=${files.length}`);

    setIndexerState({ status: 'INDEXING', files, logs: [...logs] });

    const parsedFiles = await parseFilesToAst({ rootPath, files });
    pushLog(logs, `ast-parser:parsed=${parsedFiles.length}`);

    const symbols = extractSymbols(parsedFiles);
    pushLog(logs, `symbol-extractor:symbols=${symbols.length}`);

    const dependencyGraph: DependencyGraph = mapDependencies(parsedFiles);
    pushLog(logs, `dependency-mapper:nodes=${Object.keys(dependencyGraph).length}`);

    const embeddings = generateEmbeddings({ parsedFiles });
    pushLog(logs, `embedding-generator:vectors=${embeddings.length}`);

    const index: SearchableIndex = buildSearchableIndex({
      files,
      symbols,
      dependencies: dependencyGraph,
      embeddings,
    });
    pushLog(logs, `index-builder:indexSize=${Object.keys(index.byFile).length}`);

    setIndexerState({
      files,
      symbols,
      dependencies: Object.freeze([dependencyGraph]),
      embeddings,
      index,
      status: 'COMPLETE',
      logs: [...logs],
      errors: [...errors],
    });

    const output: IndexResult = {
      success: true,
      filesIndexed: files.length,
      symbolsExtracted: symbols.length,
      indexSize: Object.keys(index.byFile).length,
      logs: Object.freeze([...logs]),
    };

    return Object.freeze(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown indexing failure';
    pushError(errors, `orchestrator:failed error=${message}`);
    setIndexerState({ status: 'FAILED', logs: [...logs], errors: [...errors] });

    const output: IndexResult = {
      success: false,
      filesIndexed: 0,
      symbolsExtracted: 0,
      indexSize: 0,
      logs: Object.freeze([...logs]),
      error: message,
    };

    return Object.freeze(output);
  }
}
