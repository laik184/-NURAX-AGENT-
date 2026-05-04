import {
  access,
  constants,
  copyFile,
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import * as path from "node:path";

// Default root is the .sandbox directory; set AGENT_PROJECT_ROOT to override.
// Individual sandboxed operations use resolveForProject() below.
const SANDBOX_BASE = path.resolve(
  process.env.AGENT_PROJECT_ROOT ?? path.join(process.cwd(), ".sandbox"),
);
const PROJECT_ROOT = SANDBOX_BASE;

const FORBIDDEN_PATHS: readonly string[] = Object.freeze([
  "/etc",
  "/var",
  "/usr",
  "/bin",
  "/sbin",
  "/boot",
  "/dev",
  "/proc",
  "/sys",
  "/root",
]);

export class FileSystemSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileSystemSafetyError";
  }
}

const isInsideRoot = (resolved: string, root: string): boolean => {
  const normalizedRoot = root.endsWith(path.sep) ? root : root + path.sep;
  return resolved === root || resolved.startsWith(normalizedRoot);
};

const enforceJail = (rawPath: string): string => {
  if (typeof rawPath !== "string" || rawPath.length === 0) {
    throw new FileSystemSafetyError("Path must be a non-empty string.");
  }

  if (rawPath.includes("\u0000")) {
    throw new FileSystemSafetyError("Null byte in path is not allowed.");
  }

  const resolved = path.resolve(PROJECT_ROOT, rawPath);

  if (!isInsideRoot(resolved, PROJECT_ROOT)) {
    throw new FileSystemSafetyError(
      `Path escapes project root: ${rawPath}`,
    );
  }

  for (const forbidden of FORBIDDEN_PATHS) {
    if (resolved === forbidden || resolved.startsWith(forbidden + path.sep)) {
      throw new FileSystemSafetyError(`Forbidden system path: ${rawPath}`);
    }
  }

  return resolved;
};

export interface FileSystemService {
  readonly projectRoot: string;
  resolve(p: string): string;
  readFile(p: string, encoding?: BufferEncoding): Promise<string>;
  writeFileAtomic(p: string, content: string): Promise<void>;
  createFileExclusive(p: string, content: string): Promise<void>;
  deleteFile(p: string): Promise<void>;
  copyFile(src: string, dst: string): Promise<void>;
  exists(p: string): Promise<boolean>;
  readDir(p: string): Promise<readonly string[]>;
  stat(p: string): Promise<{ readonly isFile: boolean; readonly isDirectory: boolean; readonly size: number; readonly mtimeMs: number }>;
  ensureDir(p: string): Promise<void>;
}

export const fileSystemService: FileSystemService = Object.freeze({
  projectRoot: PROJECT_ROOT,

  resolve(p: string): string {
    return enforceJail(p);
  },

  async readFile(p: string, encoding: BufferEncoding = "utf8"): Promise<string> {
    const safe = enforceJail(p);
    return await readFile(safe, encoding);
  },

  async writeFileAtomic(p: string, content: string): Promise<void> {
    const safe = enforceJail(p);
    await mkdir(path.dirname(safe), { recursive: true });
    const tempPath = `${safe}.tmp.${Date.now()}.${process.pid}`;
    try {
      await writeFile(tempPath, content, { encoding: "utf8" });
      await rename(tempPath, safe);
    } catch (error) {
      await unlink(tempPath).catch(() => undefined);
      throw error;
    }
  },

  async createFileExclusive(p: string, content: string): Promise<void> {
    const safe = enforceJail(p);
    await mkdir(path.dirname(safe), { recursive: true });
    const handle = await open(safe, "wx");
    await handle.close();
    const tempPath = `${safe}.tmp.${Date.now()}.${process.pid}`;
    try {
      await writeFile(tempPath, content, { encoding: "utf8" });
      await rename(tempPath, safe);
    } catch (error) {
      await unlink(safe).catch(() => undefined);
      await unlink(tempPath).catch(() => undefined);
      throw error;
    }
  },

  async deleteFile(p: string): Promise<void> {
    const safe = enforceJail(p);
    await unlink(safe);
  },

  async copyFile(src: string, dst: string): Promise<void> {
    const safeSrc = enforceJail(src);
    const safeDst = enforceJail(dst);
    await mkdir(path.dirname(safeDst), { recursive: true });
    await copyFile(safeSrc, safeDst);
  },

  async exists(p: string): Promise<boolean> {
    try {
      const safe = enforceJail(p);
      await access(safe, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  },

  async readDir(p: string): Promise<readonly string[]> {
    const safe = enforceJail(p);
    const entries = await readdir(safe);
    return Object.freeze([...entries]);
  },

  async stat(p: string) {
    const safe = enforceJail(p);
    const s = await stat(safe);
    return Object.freeze({
      isFile: s.isFile(),
      isDirectory: s.isDirectory(),
      size: s.size,
      mtimeMs: s.mtimeMs,
    });
  },

  async ensureDir(p: string): Promise<void> {
    const safe = enforceJail(p);
    await mkdir(safe, { recursive: true });
  },
});
