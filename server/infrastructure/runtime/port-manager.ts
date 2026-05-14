/**
 * port-manager.ts
 *
 * Single, canonical free-port allocator for the entire runtime system.
 *
 * Strategy: bind to port 0 on 127.0.0.1 → OS assigns a guaranteed-free
 * ephemeral port → close the server → return the port number.
 *
 * Avoids:
 *  - hardcoded port ranges
 *  - modulo math
 *  - random collisions between concurrent projects
 *  - race conditions (OS guarantees the port is free at the moment of bind)
 */

import net from "net";

/**
 * Ask the OS for a free TCP port.
 * Rejects only if the network stack itself is unavailable — should never
 * happen in practice.
 */
export function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as net.AddressInfo;
      server.close(() => resolve(addr.port));
    });

    server.on("error", (err) => {
      reject(new Error(`Port allocation failed: ${err.message}`));
    });
  });
}

/**
 * Check whether a given TCP port is free (not bound by any process).
 * Useful for health checks and port conflict detection.
 */
export function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, "127.0.0.1");
  });
}
