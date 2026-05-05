import { db, pool, schema } from "./index.ts";
import { fail, ok, type PlatformServiceInput, type PlatformServiceResult } from "../../core/orchestrator.types.ts";

const SERVICE = "persistence";

export { db, pool, schema };

export async function runPersistenceOperation(
  input: PlatformServiceInput,
): Promise<PlatformServiceResult> {
  const op = input.operation;
  try {
    switch (op) {
      case "ping": {
        const r = await pool.query("select 1 as one");
        return ok(SERVICE, op, { one: r.rows[0]?.one ?? null });
      }
      case "stats": {
        return ok(SERVICE, op, {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount,
        });
      }
      default:
        return fail(SERVICE, op, `unknown operation: ${op}`);
    }
  } catch (err) {
    return fail(SERVICE, op, err instanceof Error ? err.message : String(err));
  }
}
