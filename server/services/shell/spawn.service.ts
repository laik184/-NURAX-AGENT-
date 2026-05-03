import { spawn } from "node:child_process";

export interface SpawnConfig {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env?: Readonly<Record<string, string>>;
}

const SAFE_ENV_KEYS: readonly string[] = Object.freeze([
  "PATH",
  "HOME",
  "USER",
  "LOGNAME",
  "LANG",
  "LC_ALL",
  "TZ",
  "SHELL",
  "TERM",
  "TMPDIR",
  "NODE_ENV",
]);

const buildScrubbedEnv = (
  override?: Readonly<Record<string, string>>,
): Record<string, string> => {
  const scrubbed: Record<string, string> = {};
  for (const key of SAFE_ENV_KEYS) {
    const value = process.env[key];
    if (typeof value === "string") {
      scrubbed[key] = value;
    }
  }
  if (override) {
    for (const [key, value] of Object.entries(override)) {
      scrubbed[key] = value;
    }
  }
  return scrubbed;
};

export function spawnCommand(config: Readonly<SpawnConfig>) {
  return spawn(config.command, [...config.args], {
    cwd: config.cwd,
    env: buildScrubbedEnv(config.env),
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}
