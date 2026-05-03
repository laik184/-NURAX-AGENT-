export function pushLog(logs: string[], message: string): void {
  logs.push(`[${new Date().toISOString()}] ${message}`);
}

export function pushError(errors: string[], message: string): void {
  errors.push(`[${new Date().toISOString()}] ERROR: ${message}`);
}

export function pushWarn(logs: string[], message: string): void {
  logs.push(`[${new Date().toISOString()}] WARN: ${message}`);
}

/** Format a single log line tagged with a source name. */
export function buildLog(source: string, message: string): string {
  return `[${new Date().toISOString()}] [${source}] ${message}`;
}

/** Format a single error line tagged with a source name. */
export function buildError(source: string, message: string): string {
  return `[${new Date().toISOString()}] [${source}] ERROR: ${message}`;
}

export interface Logger {
  info: (message: string, ...args: unknown[]) => string;
  warn: (message: string, ...args: unknown[]) => string;
  error: (message: string, ...args: unknown[]) => string;
  debug: (message: string, ...args: unknown[]) => string;
}

/**
 * Create a named console logger. Each method writes to the console AND returns
 * the formatted log line, so callers can both log and append to a buffer:
 *
 *   logs.push(logger.info("started"));
 */
export function createLogger(name: string): Logger {
  const tag = `[${name}]`;
  const fmt = (level: string, message: string) =>
    `[${new Date().toISOString()}] ${tag} ${level}: ${message}`;
  return {
    info:  (message, ...args) => { const line = fmt("INFO", message);  console.log(line, ...args);   return line; },
    warn:  (message, ...args) => { const line = fmt("WARN", message);  console.warn(line, ...args);  return line; },
    error: (message, ...args) => { const line = fmt("ERROR", message); console.error(line, ...args); return line; },
    debug: (message, ...args) => {
      const line = fmt("DEBUG", message);
      if (process.env.DEBUG) console.debug(line, ...args);
      return line;
    },
  };
}
