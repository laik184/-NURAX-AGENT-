export class HttpSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HttpSafetyError";
  }
}

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 60_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

const ALLOWED_HOSTS_RAW = process.env.AGENT_HTTP_ALLOWED_HOSTS ?? "localhost,127.0.0.1,0.0.0.0,::1";
const ALLOWED_HOSTS: ReadonlySet<string> = new Set(
  ALLOWED_HOSTS_RAW.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean),
);

const PRIVATE_NET_PATTERNS: readonly RegExp[] = Object.freeze([
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^fc00:/i,
  /^fe80:/i,
]);

const isPrivateAddress = (hostname: string): boolean =>
  PRIVATE_NET_PATTERNS.some((rx) => rx.test(hostname));

const enforceUrlPolicy = (url: string): URL => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new HttpSafetyError(`Invalid URL: ${url}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new HttpSafetyError(`Disallowed protocol: ${parsed.protocol}`);
  }

  const host = parsed.hostname.toLowerCase();

  const allowedExplicitly = ALLOWED_HOSTS.has(host);
  const isLoopback = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0";

  if (!allowedExplicitly && !isLoopback) {
    if (isPrivateAddress(host)) {
      throw new HttpSafetyError(`Private network host blocked: ${host}`);
    }
    throw new HttpSafetyError(`Host not in allow-list: ${host}`);
  }

  return parsed;
};

export interface HttpRequestOptions {
  readonly method?: "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly timeoutMs?: number;
}

export interface HttpResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly bodyText: string;
  readonly truncated: boolean;
  readonly latencyMs: number;
}

export interface HttpService {
  readonly allowedHosts: ReadonlySet<string>;
  request(url: string, options?: HttpRequestOptions): Promise<HttpResponse>;
}

export const httpService: HttpService = Object.freeze({
  allowedHosts: ALLOWED_HOSTS,

  async request(url: string, options: HttpRequestOptions = {}): Promise<HttpResponse> {
    const safeUrl = enforceUrlPolicy(url);
    const timeoutMs = Math.max(100, Math.min(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();

    try {
      const response = await fetch(safeUrl.toString(), {
        method: options.method ?? "GET",
        headers: options.headers,
        body: options.body,
        signal: controller.signal,
        redirect: "manual",
      });

      const reader = response.body?.getReader();
      let received = 0;
      let truncated = false;
      const chunks: Uint8Array[] = [];

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            received += value.byteLength;
            if (received > MAX_RESPONSE_BYTES) {
              truncated = true;
              await reader.cancel().catch(() => undefined);
              break;
            }
            chunks.push(value);
          }
        }
      }

      const bodyText = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");

      return Object.freeze({
        ok: response.ok,
        status: response.status,
        bodyText,
        truncated,
        latencyMs: Date.now() - startedAt,
      });
    } finally {
      clearTimeout(timer);
    }
  },
});
