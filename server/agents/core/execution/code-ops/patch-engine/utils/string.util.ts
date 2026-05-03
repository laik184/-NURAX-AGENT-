export function wrapInAsyncFunction(
  code:         string,
  functionName: string,
): string {
  const indented = code
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
  return `async function ${functionName}() {\n${indented}\n}`;
}

export function wrapInWorkerThread(code: string): string {
  return [
    `const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');`,
    ``,
    `if (isMainThread) {`,
    `  function runInWorker(data) {`,
    `    return new Promise((resolve, reject) => {`,
    `      const worker = new Worker(__filename, { workerData: data });`,
    `      worker.on('message', resolve);`,
    `      worker.on('error', reject);`,
    `      worker.on('exit', (code) => {`,
    `        if (code !== 0) reject(new Error('Worker stopped with exit code ' + code));`,
    `      });`,
    `    });`,
    `  }`,
    `} else {`,
    `  // Worker thread logic`,
    code
      .split("\n")
      .map((l) => `  ${l}`)
      .join("\n"),
    `  if (parentPort) parentPort.postMessage(result);`,
    `}`,
  ].join("\n");
}

export function wrapInCacheLayer(
  code:      string,
  cacheKey:  string,
  ttlMs:     number,
): string {
  return [
    `const _patchCache = new Map();`,
    `const _cacheTtl = ${ttlMs};`,
    ``,
    `function _withCache(key, fn) {`,
    `  const cached = _patchCache.get(key);`,
    `  if (cached && Date.now() - cached.ts < _cacheTtl) return cached.value;`,
    `  const value = fn();`,
    `  _patchCache.set(key, { value, ts: Date.now() });`,
    `  return value;`,
    `}`,
    ``,
    `// Cached execution (key: "${cacheKey}")`,
    `const result = _withCache("${cacheKey}", () => {`,
    code
      .split("\n")
      .map((l) => `  ${l}`)
      .join("\n"),
    `});`,
  ].join("\n");
}

export function replaceSyncWithAsync(code: string): string {
  return code
    .replace(/\bfs\.readFileSync\s*\(/g,    "await fs.promises.readFile(")
    .replace(/\bfs\.writeFileSync\s*\(/g,   "await fs.promises.writeFile(")
    .replace(/\bfs\.appendFileSync\s*\(/g,  "await fs.promises.appendFile(")
    .replace(/\bfs\.readdirSync\s*\(/g,     "await fs.promises.readdir(")
    .replace(/\bfs\.mkdirSync\s*\(/g,       "await fs.promises.mkdir(")
    .replace(/\bfs\.unlinkSync\s*\(/g,      "await fs.promises.unlink(")
    .replace(/\bfs\.statSync\s*\(/g,        "await fs.promises.stat(")
    .replace(/\bcrypto\.pbkdf2Sync\s*\(/g,  "await util.promisify(crypto.pbkdf2)(")
    .replace(/\bcrypto\.scryptSync\s*\(/g,  "await util.promisify(crypto.scrypt)(")
    .replace(/\bexecSync\s*\(/g,            "await execAsync(")
    .replace(/\bspawnSync\s*\(/g,           "await spawnAsync(");
}

export function addPayloadFieldFilter(code: string): string {
  const filterHelper = [
    `function _filterFields(obj, allowedFields) {`,
    `  if (!Array.isArray(allowedFields) || !obj || typeof obj !== 'object') return obj;`,
    `  return allowedFields.reduce((acc, k) => {`,
    `    if (Object.prototype.hasOwnProperty.call(obj, k)) acc[k] = obj[k];`,
    `    return acc;`,
    `  }, {});`,
    `}`,
    ``,
  ].join("\n");
  return filterHelper + code;
}

export function injectCompressionHint(code: string): string {
  const hint = [
    `// PATCH: Enable response compression for large payloads`,
    `// Add 'compression' middleware: app.use(require('compression')())`,
    ``,
  ].join("\n");
  return hint + code;
}

export function ensureAsyncKeyword(fnCode: string): string {
  if (/^\s*async\b/.test(fnCode)) return fnCode;
  return fnCode.replace(
    /^(\s*)(function\s)/,
    "$1async $2",
  );
}
