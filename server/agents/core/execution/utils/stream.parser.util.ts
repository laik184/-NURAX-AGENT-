// ============================================================
// utils/stream.parser.ts — Parses raw stdout/stderr output
// from process and docker commands into structured data.
// Pure functions. No I/O, no local module imports.
// ============================================================

// ─── Docker-specific parsers ──────────────────────────────────

export function extractContainerId(stdout: string): string | null {
  const trimmed = stdout.trim();
  if (/^[a-f0-9]{12,64}$/.test(trimmed)) return trimmed.slice(0, 12);
  const lines = trimmed.split("\n");
  for (const line of lines) {
    const match = /^([a-f0-9]{12,64})/.exec(line.trim());
    if (match?.[1]) return match[1].slice(0, 12);
  }
  return null;
}

export function parseDockerPs(stdout: string): readonly DockerPsEntry[] {
  const lines  = stdout.trim().split("\n").slice(1);
  const result: DockerPsEntry[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.trim().split(/\s{2,}/);
    if (parts.length < 4) continue;
    result.push(Object.freeze<DockerPsEntry>({
      containerId: parts[0]?.trim() ?? "",
      image:       parts[1]?.trim() ?? "",
      status:      parts[3]?.trim() ?? "",
      name:        parts.at(-1)?.trim() ?? "",
    }));
  }
  return Object.freeze(result);
}

export interface DockerPsEntry {
  readonly containerId: string;
  readonly image:       string;
  readonly status:      string;
  readonly name:        string;
}

export function parseDockerInspectPort(stdout: string): number | null {
  const match = /"HostPort":\s*"(\d+)"/.exec(stdout);
  if (match?.[1]) {
    const port = parseInt(match[1], 10);
    return Number.isFinite(port) ? port : null;
  }
  return null;
}

export function isContainerRunning(inspectOutput: string): boolean {
  return /"Running":\s*true/i.test(inspectOutput);
}

export function extractDockerImageId(stdout: string): string | null {
  const match = /Successfully built ([a-f0-9]{12})/i.exec(stdout)
    ?? /sha256:([a-f0-9]{64})/i.exec(stdout);
  return match?.[1] ?? null;
}

// ─── Process output parsers ───────────────────────────────────

export function extractPid(stdout: string): number | null {
  const match = /\b(\d{1,7})\b/.exec(stdout.trim());
  const pid   = match ? parseInt(match[1]!, 10) : null;
  return pid !== null && pid > 0 ? pid : null;
}

export function parsePidFile(content: string): number | null {
  const num = parseInt(content.trim(), 10);
  return Number.isFinite(num) && num > 0 ? num : null;
}

// ─── General output helpers ───────────────────────────────────

export function firstLine(output: string): string {
  return output.split("\n")[0]?.trim() ?? "";
}

export function lastLine(output: string): string {
  const lines = output.trim().split("\n");
  return lines.at(-1)?.trim() ?? "";
}

export function filterLines(
  output:  string,
  pattern: RegExp
): readonly string[] {
  return Object.freeze(
    output.split("\n")
      .map(l => l.trim())
      .filter(l => pattern.test(l))
  );
}

export function truncate(output: string, maxChars = 4096): string {
  if (output.length <= maxChars) return output;
  const half = Math.floor(maxChars / 2);
  return `${output.slice(0, half)}\n... [truncated] ...\n${output.slice(-half)}`;
}

export function sanitiseOutput(raw: string): string {
  return raw
    .replace(/\x1B\[[0-9;]*[mGKH]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

// ─── Error extractor ─────────────────────────────────────────

export function extractError(stderr: string, stdout: string): string {
  const sanitised = sanitiseOutput(stderr || stdout);
  return truncate(sanitised, 1024);
}
