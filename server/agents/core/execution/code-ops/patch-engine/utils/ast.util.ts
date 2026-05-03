const SYNC_FS_RE      = /\b(?:fs\.|require\('fs'\)\.)(?:readFileSync|writeFileSync|appendFileSync|readdirSync|mkdirSync|unlinkSync|statSync|existsSync)\s*\(/g;
const SYNC_CRYPTO_RE  = /\b(?:crypto\.)(pbkdf2Sync|scryptSync|randomFillSync)\s*\(/g;
const SYNC_CHILD_RE   = /\bexecSync\s*\(|spawnSync\s*\(/g;
const SYNC_PARSE_RE   = /\bJSON\.parse\s*\(/g;
const HEAVY_LOOP_RE   = /\bfor\s*\(|while\s*\(/g;
const ASYNC_MARKER_RE = /\basync\b/;
const AWAIT_RE        = /\bawait\b/;
const CALLBACK_RE     = /function\s*\([^)]*callback|,\s*callback\s*\)/;
const PROMISE_RE      = /new\s+Promise\s*\(|\.then\s*\(|\.catch\s*\(/;
const FUNCTION_RE     = /(?:^|\s)function\s+(\w+)\s*\(|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-z]\w*)\s*=>/gm;
const LARGE_OBJECT_RE = /(?:res\.json|res\.send|response\.json)\s*\(\s*\{/g;

export function hasSyncFsCalls(code: string): boolean {
  SYNC_FS_RE.lastIndex = 0;
  return SYNC_FS_RE.test(code);
}

export function hasSyncCryptoCalls(code: string): boolean {
  SYNC_CRYPTO_RE.lastIndex = 0;
  return SYNC_CRYPTO_RE.test(code);
}

export function hasSyncChildProcess(code: string): boolean {
  SYNC_CHILD_RE.lastIndex = 0;
  return SYNC_CHILD_RE.test(code);
}

export function hasHeavyLoops(code: string): boolean {
  HEAVY_LOOP_RE.lastIndex = 0;
  return HEAVY_LOOP_RE.test(code);
}

export function isAlreadyAsync(code: string): boolean {
  return ASYNC_MARKER_RE.test(code) && AWAIT_RE.test(code);
}

export function hasCallbacks(code: string): boolean {
  CALLBACK_RE.lastIndex = 0;
  return CALLBACK_RE.test(code);
}

export function hasPromiseChains(code: string): boolean {
  PROMISE_RE.lastIndex = 0;
  return PROMISE_RE.test(code);
}

export function hasJsonParse(code: string): boolean {
  SYNC_PARSE_RE.lastIndex = 0;
  return SYNC_PARSE_RE.test(code);
}

export function hasLargeResponseObjects(code: string): boolean {
  LARGE_OBJECT_RE.lastIndex = 0;
  return LARGE_OBJECT_RE.test(code);
}

export function extractFunctionNames(code: string): readonly string[] {
  const names: string[] = [];
  FUNCTION_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FUNCTION_RE.exec(code)) !== null) {
    const name = match[1] ?? match[2];
    if (name) names.push(name);
  }
  return Object.freeze(names);
}

export function hasSyncBlockingCalls(code: string): boolean {
  return (
    hasSyncFsCalls(code) ||
    hasSyncCryptoCalls(code) ||
    hasSyncChildProcess(code)
  );
}
