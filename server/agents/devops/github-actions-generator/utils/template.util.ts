import type { Language, RunnerOs } from "../types.js";

export interface LanguageDefaults {
  readonly setupAction: string;
  readonly versionInput: string;
  readonly defaultVersion: string;
  readonly installCommand: string;
  readonly testCommand: string;
  readonly buildCommand: string;
  readonly lintCommand: string;
  readonly cacheKey: string;
}

const LANGUAGE_DEFAULTS: Readonly<Record<Language, LanguageDefaults>> = Object.freeze({
  node: Object.freeze({
    setupAction: "actions/setup-node@v4",
    versionInput: "node-version",
    defaultVersion: "20",
    installCommand: "npm ci",
    testCommand: "npm test",
    buildCommand: "npm run build",
    lintCommand: "npm run lint",
    cacheKey: "node-modules",
  }),
  python: Object.freeze({
    setupAction: "actions/setup-python@v5",
    versionInput: "python-version",
    defaultVersion: "3.11",
    installCommand: "pip install -r requirements.txt",
    testCommand: "pytest",
    buildCommand: "python -m build",
    lintCommand: "flake8 .",
    cacheKey: "pip-packages",
  }),
  go: Object.freeze({
    setupAction: "actions/setup-go@v5",
    versionInput: "go-version",
    defaultVersion: "1.22",
    installCommand: "go mod download",
    testCommand: "go test ./...",
    buildCommand: "go build ./...",
    lintCommand: "golangci-lint run",
    cacheKey: "go-modules",
  }),
  java: Object.freeze({
    setupAction: "actions/setup-java@v4",
    versionInput: "java-version",
    defaultVersion: "21",
    installCommand: "mvn install -DskipTests",
    testCommand: "mvn test",
    buildCommand: "mvn package",
    lintCommand: "mvn checkstyle:check",
    cacheKey: "maven-packages",
  }),
  rust: Object.freeze({
    setupAction: "dtolnay/rust-toolchain@stable",
    versionInput: "toolchain",
    defaultVersion: "stable",
    installCommand: "cargo fetch",
    testCommand: "cargo test",
    buildCommand: "cargo build --release",
    lintCommand: "cargo clippy -- -D warnings",
    cacheKey: "cargo-registry",
  }),
  generic: Object.freeze({
    setupAction: "",
    versionInput: "",
    defaultVersion: "",
    installCommand: "echo 'No install step'",
    testCommand: "echo 'No test step'",
    buildCommand: "echo 'No build step'",
    lintCommand: "echo 'No lint step'",
    cacheKey: "generic-cache",
  }),
});

export function getLanguageDefaults(language: Language): LanguageDefaults {
  return LANGUAGE_DEFAULTS[language];
}

export function getDefaultRunner(): RunnerOs {
  return "ubuntu-latest";
}

export function getCheckoutStep() {
  return Object.freeze({
    name: "Checkout code",
    uses: "actions/checkout@v4",
  });
}

export function getCacheStep(language: Language, packageManager?: string) {
  const defaults = LANGUAGE_DEFAULTS[language];
  const cacheKey = packageManager
    ? `${packageManager}-cache`
    : defaults.cacheKey;

  return Object.freeze({
    name: "Cache dependencies",
    uses: "actions/cache@v4",
    with: Object.freeze({
      path: getCachePath(language, packageManager),
      key: `\${{ runner.os }}-${cacheKey}-\${{ hashFiles('**/lockfiles') }}`,
      "restore-keys": `\${{ runner.os }}-${cacheKey}-`,
    }),
  });
}

function getCachePath(language: Language, packageManager?: string): string {
  const pm = packageManager ?? "";
  if (language === "node") {
    if (pm === "yarn") return "~/.yarn/cache";
    if (pm === "pnpm") return "~/.pnpm-store";
    return "~/.npm";
  }
  if (language === "python") return "~/.cache/pip";
  if (language === "go") return "~/go/pkg/mod";
  if (language === "rust") return "~/.cargo/registry";
  if (language === "java") return "~/.m2/repository";
  return ".cache";
}
