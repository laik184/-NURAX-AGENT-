# Environment Pipeline Validator

HVP-compliant pre-deployment environment validator. Detects missing variables, format errors, schema violations, exposed secrets, and policy breaches before CI/CD runs.

---

## Architecture Layers

```
L0  →  types.ts, state.ts          (contracts — no upward imports)
L1  →  orchestrator.ts             (pipeline sequencing — no logic)
L2  →  agents/                     (one job each — import L0 + L3 only)
L3  →  utils/                      (pure helpers — no agent imports)
```

**Import direction:** L1 → L2 → L3 → L0. No agent-to-agent imports. All secrets masked in logs — never exposed.

---

## Validation Pipeline Flow

```
caller
  └─ orchestrator.validateEnv({ schema, envString, extraEnv, customPolicies })
       │
       ├─ 1. env-loader         → parse .env string + merge process.env + extraEnv
       │       env-parser.util → mask.util
       │
       ├─ 2. missing-check      → compare required schema keys against loaded env
       │       env-parser.util
       │
       ├─ 3. format-validator   → check type, pattern, minLength, maxLength, allowedValues
       │       type-checker.util → regex.util → mask.util
       │
       ├─ 4. schema-validator   → enforce required fields, detect undeclared vars, example value misuse
       │       mask.util
       │
       ├─ 5. secret-detector    → scan for known API key patterns, weak passwords, short secrets
       │       regex.util → mask.util
       │
       └─ 6. policy-enforcer    → apply built-in + custom security policies
               mask.util
```

---

## File Responsibilities

| File | Layer | Responsibility |
|---|---|---|
| `types.ts` | L0 | `EnvSchema`, `EnvValidationResult`, `ValidationError`, `PolicyRule`, `SecretFinding`, state types |
| `state.ts` | L0 | Frozen `INITIAL_STATE` + pure `transitionState` |
| `orchestrator.ts` | L1 | Input validation, pipeline sequencing, result aggregation |
| `agents/env-loader.agent.ts` | L2 | Parse `.env` string, merge `process.env` + `extraEnv`, mask sensitive keys in logs |
| `agents/missing-check.agent.ts` | L2 | Diff required schema keys against loaded env, return missing list |
| `agents/format-validator.agent.ts` | L2 | Validate type, regex pattern, length bounds, allowedValues per schema entry |
| `agents/schema-validator.agent.ts` | L2 | Enforce required/optional rules, flag undeclared vars, detect example-value misuse |
| `agents/secret-detector.agent.ts` | L2 | Match known secret patterns (AWS, GitHub, Stripe), detect weak/short secrets |
| `agents/policy-enforcer.agent.ts` | L2 | Apply built-in rules (no DEBUG in prod, HTTPS-only URLs, no weak DB passwords) + custom policies |
| `utils/env-parser.util.ts` | L3 | `.env` file parser, `mergeEnvSources`, `loadProcessEnv`, `diffEnvKeys` |
| `utils/regex.util.ts` | L3 | `PATTERNS` map (url/email/port/token), `isWeakSecret`, `detectExposedSecretType` |
| `utils/type-checker.util.ts` | L3 | `checkType` for all `EnvValueType` values, `coerceValue`, `typeDescription` |
| `utils/mask.util.ts` | L3 | `maskValue`, `maskEnvRecord`, `isSensitiveKey` |
| `utils/logger.util.ts` | L3 | Timestamped log and error string builders |
| `index.ts` | — | Public API: `validateEnv`, `getEnvReport` |

---

## Output Format

Every operation returns a frozen `AgentResult`:

```ts
{
  nextState: Readonly<EnvValidatorState>,
  output: Readonly<EnvValidationResult>
}

// EnvValidationResult shape:
{
  success: boolean,
  missing: readonly string[],
  invalid: readonly ValidationError[],
  warnings: readonly string[],
  logs: readonly string[],
  error?: string
}
```

---

## Built-in Policies

| Policy ID | Severity | Rule |
|---|---|---|
| `no-debug-in-production` | error | `DEBUG` must be off when `NODE_ENV=production` |
| `no-plain-database-password` | critical | DB password must not be a known weak value |
| `https-only-urls` | error | All `*_URL` / `*_ENDPOINT` must use HTTPS in production |
| `no-localhost-in-production` | warning | No `localhost` / `127.0.0.1` in production values |
| `required-secrets-not-empty` | critical | Required secret keys must not be empty |

---

## Example Validation

**Schema:**

```ts
const schema: EnvSchema[] = [
  { key: "DATABASE_URL",  type: "url",    required: true,  secret: false },
  { key: "JWT_SECRET",    type: "token",  required: true,  secret: true, minLength: 32 },
  { key: "PORT",          type: "port",   required: true,  secret: false, allowedValues: ["3000","8080"] },
  { key: "NODE_ENV",      type: "string", required: true,  allowedValues: ["development","staging","production"] },
  { key: "SMTP_PASSWORD", type: "string", required: false, secret: true },
];
```

**Passing case:**

```ts
validateEnv({
  schema,
  extraEnv: {
    DATABASE_URL: "https://db.example.com/myapp",
    JWT_SECRET: "a-very-long-random-secret-value-here!!",
    PORT: "3000",
    NODE_ENV: "production",
  },
})
// → { success: true, missing: [], invalid: [], warnings: [...] }
```

---

## Failure Scenario

**Input with problems:**

```env
DATABASE_URL=http://localhost:5432/mydb
JWT_SECRET=secret
PORT=99999
NODE_ENV=production
DEBUG=true
```

**Detected issues:**

| Agent | Finding | Severity |
|---|---|---|
| format-validator | `PORT` 99999 out of range 1–65535 | error |
| format-validator | `JWT_SECRET` too short (< 32 chars) | error |
| format-validator | `DATABASE_URL` not a valid HTTPS URL | error |
| secret-detector | `JWT_SECRET` is a weak placeholder | high risk |
| policy-enforcer | `DEBUG` enabled in production | error |
| policy-enforcer | `DATABASE_URL` uses HTTP in production | error |
| policy-enforcer | `DATABASE_URL` contains localhost in production | warning |

**Result:** `{ success: false, error: "validation_failed", missing: [], invalid: [...5 errors...], warnings: [...1 warning...] }`

---

## HVP Compliance Checklist

- [x] Only downward imports (L1 → L2 → L3 → L0)
- [x] No agent-to-agent imports
- [x] One responsibility per agent
- [x] All outputs `Object.freeze`d
- [x] Secrets masked in every log entry — never plaintext
- [x] No deployment execution — pure validation
- [x] Orchestrator contains zero business logic
