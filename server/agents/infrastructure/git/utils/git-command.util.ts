import { execFile } from 'node:child_process';

export interface GitCommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

export const runGitCommand = (
  args: string[],
  cwd: string = process.cwd(),
): Promise<GitCommandResult> =>
  new Promise((resolve, reject) => {
    execFile('git', args, { cwd, timeout: 30_000 }, (error, stdout, stderr) => {
      if (error) {
        reject({
          stdout: stdout ?? '',
          stderr: stderr ?? error.message,
          code: typeof (error as { code?: number }).code === 'number' ? (error as { code: number }).code : 1,
        } satisfies GitCommandResult);
        return;
      }

      resolve({
        stdout: stdout ?? '',
        stderr: stderr ?? '',
        code: 0,
      });
    });
  });
