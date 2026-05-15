import { db } from "../../../infrastructure/db/index.ts";
import { deploymentDomains } from "../../../../shared/schema.ts";
import { eq, and } from "drizzle-orm";
import { dnsVerifier, validateDomain, getDnsRecords } from "./dns-verifier.ts";
import type { DomainEntry, DomainStatus, DnsRecord } from "../../types.ts";

export class DomainManager {
  async listDomains(projectId: number): Promise<DomainEntry[]> {
    const rows = await db
      .select()
      .from(deploymentDomains)
      .where(eq(deploymentDomains.projectId, projectId));
    return rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      name: r.name,
      status: r.status as DomainStatus,
      addedAt: r.addedAt.getTime(),
    }));
  }

  async addDomain(projectId: number, rawName: string): Promise<{ err: string } | DomainEntry> {
    const { err, val } = validateDomain(rawName);
    if (err) return { err };

    const existing = await db
      .select()
      .from(deploymentDomains)
      .where(and(eq(deploymentDomains.projectId, projectId), eq(deploymentDomains.name, val)));
    if (existing.length > 0) return { err: "Domain already connected." };

    const [row] = await db
      .insert(deploymentDomains)
      .values({ projectId, name: val, status: "pending" })
      .returning();

    const entry: DomainEntry = {
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      status: "pending",
      addedAt: row.addedAt.getTime(),
    };

    dnsVerifier.scheduleVerification(
      row.id,
      () => this.updateStatus(row.id, "verifying"),
      () => this.updateStatus(row.id, "connected"),
      () => this.updateStatus(row.id, "error"),
    );

    return entry;
  }

  async removeDomain(projectId: number, domainId: number): Promise<boolean> {
    dnsVerifier.cancelVerification(domainId);
    const result = await db
      .delete(deploymentDomains)
      .where(and(eq(deploymentDomains.id, domainId), eq(deploymentDomains.projectId, projectId)))
      .returning();
    return result.length > 0;
  }

  async retryDomain(projectId: number, domainId: number): Promise<boolean> {
    const [row] = await db
      .select()
      .from(deploymentDomains)
      .where(and(eq(deploymentDomains.id, domainId), eq(deploymentDomains.projectId, projectId)));
    if (!row) return false;

    await db
      .update(deploymentDomains)
      .set({ status: "pending" })
      .where(eq(deploymentDomains.id, domainId));

    dnsVerifier.scheduleVerification(
      domainId,
      () => this.updateStatus(domainId, "verifying"),
      () => this.updateStatus(domainId, "connected"),
      () => this.updateStatus(domainId, "error"),
    );
    return true;
  }

  getDnsRecords(domain: string): DnsRecord[] {
    return getDnsRecords(domain);
  }

  private async updateStatus(domainId: number, status: DomainStatus): Promise<void> {
    await db
      .update(deploymentDomains)
      .set({ status })
      .where(eq(deploymentDomains.id, domainId));
  }
}

export const domainManager = new DomainManager();
