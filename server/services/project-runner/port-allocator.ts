import net from "node:net";

const usedPorts = new Set<number>();

export function reservePort(port: number): void {
  usedPorts.add(port);
}

export function releasePort(port: number): void {
  usedPorts.delete(port);
}

export async function findFreePort(start: number, end: number): Promise<number> {
  for (let p = start; p <= end; p++) {
    if (usedPorts.has(p)) continue;
    const free = await new Promise<boolean>((resolve) => {
      const srv = net.createServer();
      srv.once("error", () => resolve(false));
      srv.once("listening", () => srv.close(() => resolve(true)));
      srv.listen(p, "127.0.0.1");
    });
    if (free) return p;
  }
  throw new Error(`No free port in range ${start}-${end}`);
}
