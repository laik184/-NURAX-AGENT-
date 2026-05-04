import {
  applyPatch,
  applyBatchPatch,
  getHistory,
  resetCounter,
} from "./index.js";
import type { PatchResult, DiffResult } from "./index.js";
import { applyAsyncRefactor }         from "./agents/async-refactor.agent.js";
import { applyCacheInjection }        from "./agents/cache-injector.agent.js";
import { applySyncReduction }         from "./agents/sync-reducer.agent.js";
import { applyWorkerThreadInjection } from "./agents/worker-thread-injector.agent.js";
import { applyPayloadOptimization }   from "./agents/payload-optimizer.agent.js";
import { buildDiff }                  from "./diff.builder.js";
import {
  hasSyncFsCalls, hasSyncCryptoCalls, hasHeavyLoops,
  isAlreadyAsync, hasCallbacks, hasLargeResponseObjects,
} from "./utils/ast.util.js";
import {
  wrapInWorkerThread, wrapInCacheLayer,
  replaceSyncWithAsync, addPayloadFieldFilter,
} from "./utils/string.util.js";
import {
  validateCode, validatePatchType,
  validatePatchRequest, validateBatchRequest,
} from "./utils/validation.util.js";
import { clearAll } from "./state.js";

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean): void {
  if (condition) { console.log(`  ✓ ${label}`); passed++; }
  else           { console.error(`  ✗ ${label}`); failed++; }
}

function beforeEach(fn: () => void) { fn(); }
beforeEach(() => { clearAll(); resetCounter(); });

// ─── utils/ast.helper ────────────────────────────────────────────────────────
console.log("\n── utils/ast.helper ──");
{
  assert("hasSyncFsCalls: readFileSync → true",   hasSyncFsCalls("fs.readFileSync('/a')"));
  assert("hasSyncFsCalls: writeFileSync → true",  hasSyncFsCalls("fs.writeFileSync('/a','')"));
  assert("hasSyncFsCalls: async code → false",    !hasSyncFsCalls("await fs.promises.readFile('/a')"));
  assert("hasSyncCryptoCalls: pbkdf2Sync → true", hasSyncCryptoCalls("crypto.pbkdf2Sync(pw,salt,1000,64,'sha512')"));
  assert("hasSyncCryptoCalls: async → false",     !hasSyncCryptoCalls("await util.promisify(crypto.pbkdf2)(a,b,c,d,e)"));
  assert("hasHeavyLoops: for → true",             hasHeavyLoops("for(let i=0;i<n;i++){}"));
  assert("hasHeavyLoops: while → true",           hasHeavyLoops("while(true){}"));
  assert("hasHeavyLoops: no loops → false",       !hasHeavyLoops("const x = 1;"));
  assert("isAlreadyAsync: async+await → true",    isAlreadyAsync("async function f(){ await x; }"));
  assert("isAlreadyAsync: missing await → false", !isAlreadyAsync("async function f(){ return x; }"));
  assert("hasCallbacks: callback param → true",   hasCallbacks("function doThing(data, callback){}"));
  assert("hasLargeResponseObjects: res.json → true", hasLargeResponseObjects("res.json({ id, name })"));
}

// ─── utils/string.util ────────────────────────────────────────────────
console.log("\n── utils/string.util ──");
{
  const asyncCode = replaceSyncWithAsync("const d = fs.readFileSync('/f', 'utf8');");
  assert("replaceSyncWithAsync: readFileSync replaced",
    asyncCode.includes("fs.promises.readFile"));
  assert("replaceSyncWithAsync: original not present",
    !asyncCode.includes("readFileSync"));

  const cryptoCode = replaceSyncWithAsync("const h = crypto.pbkdf2Sync(p,s,1000,64,'sha512');");
  assert("replaceSyncWithAsync: pbkdf2Sync replaced",
    cryptoCode.includes("util.promisify(crypto.pbkdf2)"));

  const cached = wrapInCacheLayer("const x = compute();", "my_key", 30000);
  assert("wrapInCacheLayer: contains _patchCache",   cached.includes("_patchCache"));
  assert("wrapInCacheLayer: contains TTL",           cached.includes("30000"));
  assert("wrapInCacheLayer: contains key",           cached.includes("my_key"));
  assert("wrapInCacheLayer: contains _withCache",    cached.includes("_withCache"));

  const worker = wrapInWorkerThread("const r = heavyCompute();");
  assert("wrapInWorkerThread: contains worker_threads", worker.includes("worker_threads"));
  assert("wrapInWorkerThread: contains isMainThread",   worker.includes("isMainThread"));
  assert("wrapInWorkerThread: contains parentPort",     worker.includes("parentPort"));

  const filtered = addPayloadFieldFilter("res.json(data);");
  assert("addPayloadFieldFilter: injects _filterFields", filtered.includes("_filterFields"));
  assert("addPayloadFieldFilter: original code preserved",filtered.includes("res.json(data);"));
}

// ─── utils/validation.helper ─────────────────────────────────────────────────
console.log("\n── utils/validation.helper ──");
{
  assert("validateCode: valid string → valid=true",     validateCode("const x = 1;").valid);
  assert("validateCode: empty string → valid=false",    !validateCode("").valid);
  assert("validateCode: number → valid=false",          !validateCode(42).valid);
  assert("validateCode: null → valid=false",            !validateCode(null).valid);
  assert("validatePatchType: ASYNC_REFACTOR → valid",  validatePatchType("ASYNC_REFACTOR").valid);
  assert("validatePatchType: CACHE_INJECTION → valid", validatePatchType("CACHE_INJECTION").valid);
  assert("validatePatchType: unknown → invalid",        !validatePatchType("UNKNOWN").valid);
  assert("validatePatchType: number → invalid",         !validatePatchType(123).valid);
  assert("validatePatchRequest: valid req → valid",     validatePatchRequest({ code: "x", patchType: "SYNC_REDUCTION", targetHint: null }).valid);
  assert("validatePatchRequest: null → invalid",        !validatePatchRequest(null).valid);
  assert("validatePatchRequest: bad type → invalid",    !validatePatchRequest({ code: "x", patchType: "BAD" }).valid);
  assert("validateBatchRequest: valid → valid",         validateBatchRequest({ code: "x", patchTypes: ["ASYNC_REFACTOR"] }).valid);
  assert("validateBatchRequest: empty types → invalid", !validateBatchRequest({ code: "x", patchTypes: [] }).valid);
}

// ─── diff.builder ─────────────────────────────────────────────────────────────
console.log("\n── diff.builder ──");
{
  const same = buildDiff("hello\nworld", "hello\nworld");
  assert("diff same: linesAdded=0",   same.linesAdded   === 0);
  assert("diff same: linesRemoved=0", same.linesRemoved === 0);
  assert("diff same: frozen",         Object.isFrozen(same));
  assert("diff same: hunks frozen",   Object.isFrozen(same.hunks));
  assert("diff same: all unchanged",  same.hunks.every((h) => h.kind === "unchanged"));

  const diff = buildDiff("const x = 1;", "const x = 2;");
  assert("diff changed: has hunks",    diff.hunks.length > 0);
  assert("diff changed: has removed",  diff.hunks.some((h) => h.kind === "removed"));
  assert("diff changed: has added",    diff.hunks.some((h) => h.kind === "added"));
  assert("diff changed: frozen",       Object.isFrozen(diff));

  const added = buildDiff("line1", "line1\nline2");
  assert("diff added: linesAdded=1",   added.linesAdded === 1);
  assert("diff added: linesRemoved=0", added.linesRemoved === 0);
}

// ─── async-refactor.patch ─────────────────────────────────────────────────────
console.log("\n── async-refactor.patch ──");
{
  const code = `function loadFile() {\n  const data = fs.readFileSync('/tmp/file', 'utf8');\n  return data;\n}`;
  const r = applyAsyncRefactor("t-001", code);
  assert("async-refactor: status=SUCCESS",           r.status === "SUCCESS");
  assert("async-refactor: patchedCode has await",    r.patchedCode.includes("await"));
  assert("async-refactor: readFileSync removed",     !r.patchedCode.includes("readFileSync"));
  assert("async-refactor: frozen",                   Object.isFrozen(r));
  assert("async-refactor: transformationId set",     r.transformationId === "t-001");
  assert("async-refactor: reason=null",              r.reason === null);
  assert("async-refactor: appliedAt > 0",            r.appliedAt > 0);
  assert("async-refactor: diffSummary frozen",       Object.isFrozen(r.diffSummary));

  const alreadyAsync = `async function f() {\n  const d = await fs.promises.readFile('/f');\n  return d;\n}`;
  const skipped = applyAsyncRefactor("t-002", alreadyAsync);
  assert("async-refactor skipped: already async",   skipped.status === "SKIPPED");
  assert("async-refactor skipped: code unchanged",  skipped.patchedCode === alreadyAsync);

  const noMatch = applyAsyncRefactor("t-003", "const x = 1 + 2;");
  assert("async-refactor: no pattern → SKIPPED",    noMatch.status === "SKIPPED");
}

// ─── cache-injector.patch ─────────────────────────────────────────────────────
console.log("\n── cache-injector.patch ──");
{
  const fetchCode = `const res = await fetch('https://api.example.com/users');\nconst data = await res.json();`;
  const r = applyCacheInjection("c-001", fetchCode, "user_list");
  assert("cache-injector: status=SUCCESS",          r.status === "SUCCESS");
  assert("cache-injector: _patchCache present",     r.patchedCode.includes("_patchCache"));
  assert("cache-injector: cache key embedded",      r.patchedCode.includes("user_list"));
  assert("cache-injector: frozen",                  Object.isFrozen(r));
  assert("cache-injector: reason=null",             r.reason === null);

  const dbCode = `const users = await query('SELECT * FROM users');`;
  const dbR = applyCacheInjection("c-002", dbCode, null);
  assert("cache-injector: DB query cached",         dbR.status === "SUCCESS");

  const plain = applyCacheInjection("c-003", "const x = 1;", null);
  assert("cache-injector: plain code → SKIPPED",   plain.status === "SKIPPED");
  assert("cache-injector: patchedCode unchanged",   plain.patchedCode === "const x = 1;");
}

// ─── sync-reducer.patch ───────────────────────────────────────────────────────
console.log("\n── sync-reducer.patch ──");
{
  const syncCode = `const raw = fs.readFileSync('/etc/hosts', 'utf8');\nconst lines = raw.split('\\n');`;
  const r = applySyncReduction("s-001", syncCode);
  assert("sync-reducer: status=SUCCESS",             r.status === "SUCCESS");
  assert("sync-reducer: readFileSync removed",       !r.patchedCode.includes("readFileSync"));
  assert("sync-reducer: fs.promises.readFile used",  r.patchedCode.includes("fs.promises.readFile"));
  assert("sync-reducer: frozen",                     Object.isFrozen(r));
  assert("sync-reducer: reason=null",                r.reason === null);
  assert("sync-reducer: diff has changes",           r.diffSummary.linesAdded > 0 || r.diffSummary.linesRemoved > 0);

  const clean = applySyncReduction("s-002", "const x = Math.random();");
  assert("sync-reducer: no sync → SKIPPED",          clean.status === "SKIPPED");

  const crypto = applySyncReduction("s-003", "const h = crypto.pbkdf2Sync(pw,s,1000,64,'sha512');");
  assert("sync-reducer: pbkdf2Sync patched",         crypto.status === "SUCCESS");
  assert("sync-reducer: pbkdf2Sync removed",         !crypto.patchedCode.includes("pbkdf2Sync"));
}

// ─── worker-thread-injector.patch ─────────────────────────────────────────────
console.log("\n── worker-thread-injector.patch ──");
{
  const heavyCode = `for (let i = 0; i < 1e9; i++) {\n  result += compute(i);\n}\nreturn result;`;
  const r = applyWorkerThreadInjection("w-001", heavyCode);
  assert("worker-injector: status=SUCCESS",          r.status === "SUCCESS");
  assert("worker-injector: worker_threads present",  r.patchedCode.includes("worker_threads"));
  assert("worker-injector: isMainThread present",    r.patchedCode.includes("isMainThread"));
  assert("worker-injector: frozen",                  Object.isFrozen(r));
  assert("worker-injector: reason=null",             r.reason === null);

  const alreadyWorker = `const { Worker } = require('worker_threads');\nworker.on('message', cb);`;
  const skip = applyWorkerThreadInjection("w-002", alreadyWorker);
  assert("worker-injector: already has workers → SKIPPED", skip.status === "SKIPPED");

  const simple = applyWorkerThreadInjection("w-003", "const x = 1;");
  assert("worker-injector: simple code → SKIPPED",   simple.status === "SKIPPED");
}

// ─── payload-optimizer.patch ──────────────────────────────────────────────────
console.log("\n── payload-optimizer.patch ──");
{
  const bigRes = `const result = { ...userData, ...sessionData, ...metaData };\nres.json(result);`;
  const r = applyPayloadOptimization("p-001", bigRes);
  assert("payload-optimizer: status=SUCCESS",        r.status === "SUCCESS");
  assert("payload-optimizer: _filterFields injected",r.patchedCode.includes("_filterFields"));
  assert("payload-optimizer: compression hint added",r.patchedCode.includes("compression"));
  assert("payload-optimizer: frozen",                Object.isFrozen(r));
  assert("payload-optimizer: reason=null",           r.reason === null);

  const smallRes = applyPayloadOptimization("p-002", "const x = 1;");
  assert("payload-optimizer: no pattern → SKIPPED",  smallRes.status === "SKIPPED");
  assert("payload-optimizer: code unchanged",        smallRes.patchedCode === "const x = 1;");

  const jsonBig = applyPayloadOptimization("p-003", `const s = JSON.stringify(largeObject);\nres.send(s);`);
  assert("payload-optimizer: JSON.stringify large → SUCCESS", jsonBig.status === "SUCCESS");
}

// ─── orchestrator: applyPatch ─────────────────────────────────────────────────
console.log("\n── orchestrator: applyPatch ──");
{
  clearAll(); resetCounter();

  const r1 = applyPatch({
    code:       "const d = fs.readFileSync('/tmp/x', 'utf8');",
    patchType:  "SYNC_REDUCTION",
    targetHint: null,
  });
  assert("orch: status=SUCCESS",              r1.status === "SUCCESS");
  assert("orch: frozen",                      Object.isFrozen(r1));
  assert("orch: patchType=SYNC_REDUCTION",    r1.patchType === "SYNC_REDUCTION");
  assert("orch: transformationId set",        r1.transformationId.startsWith("ptch-"));
  assert("orch: diffSummary frozen",          Object.isFrozen(r1.diffSummary));
  assert("orch: originalCode preserved",      r1.originalCode.includes("readFileSync"));

  const invalid = applyPatch(null as any);
  assert("orch: null request → INVALID",      invalid.status === "INVALID");
  assert("orch: INVALID frozen",              Object.isFrozen(invalid));

  const badType = applyPatch({ code: "x", patchType: "FAKE" as any, targetHint: null });
  assert("orch: bad patchType → INVALID",     badType.status === "INVALID");
}

// ─── orchestrator: applyBatchPatch ────────────────────────────────────────────
console.log("\n── orchestrator: applyBatchPatch ──");
{
  clearAll(); resetCounter();

  const code = `const raw = fs.readFileSync('/tmp/d.json','utf8');\nconst d = JSON.parse(raw);\nres.json({...d,...extra});`;

  const batch = applyBatchPatch({
    code,
    patchTypes: ["SYNC_REDUCTION", "CACHE_INJECTION", "PAYLOAD_OPTIMIZATION"],
  });

  assert("batch: results.length=3",             batch.results.length === 3);
  assert("batch: frozen",                       Object.isFrozen(batch));
  assert("batch: results frozen",               Object.isFrozen(batch.results));
  assert("batch: finalCode is string",          typeof batch.finalCode === "string");
  assert("batch: sessionId set",                batch.sessionId.startsWith("ses-"));
  assert("batch: appliedAt > 0",                batch.appliedAt > 0);
  assert("batch: each result frozen",           batch.results.every((r) => Object.isFrozen(r)));
  assert("batch: finalCode differs from input", batch.finalCode !== code);

  const emptyBatch = applyBatchPatch({ code: "x", patchTypes: [] });
  assert("batch: empty patchTypes → 0 results", emptyBatch.results.length === 0);

  const nullBatch = applyBatchPatch(null as any);
  assert("batch: null → 0 results",             nullBatch.results.length === 0);
}

// ─── history tracking ─────────────────────────────────────────────────────────
console.log("\n── history tracking ──");
{
  clearAll(); resetCounter();

  applyPatch({ code: "fs.readFileSync('/x')", patchType: "SYNC_REDUCTION",  targetHint: null });
  applyPatch({ code: "fetch('https://a.com')", patchType: "CACHE_INJECTION", targetHint: null });
  applyBatchPatch({ code: "for(;;){}", patchTypes: ["WORKER_THREAD_INJECTION"] });

  const history = getHistory();
  assert("history: frozen",               Object.isFrozen(history));
  assert("history: entries > 0",          history.length > 0);
}

// ─── determinism ──────────────────────────────────────────────────────────────
console.log("\n── determinism ──");
{
  clearAll(); resetCounter();
  const code = "const d = fs.readFileSync('/f', 'utf8');";

  const r1 = applyPatch({ code, patchType: "SYNC_REDUCTION", targetHint: null });
  clearAll(); resetCounter();
  const r2 = applyPatch({ code, patchType: "SYNC_REDUCTION", targetHint: null });

  assert("determinism: patchedCode identical",   r1.patchedCode === r2.patchedCode);
  assert("determinism: status identical",        r1.status      === r2.status);
  assert("determinism: linesAdded identical",    r1.diffSummary.linesAdded === r2.diffSummary.linesAdded);
  assert("determinism: originalCode identical",  r1.originalCode === r2.originalCode);
}

// ─── Results ──────────────────────────────────────────────────────────────────
console.log(`\n── Results: ${passed} passed, ${failed} failed ──`);
if (failed > 0) process.exit(1);
