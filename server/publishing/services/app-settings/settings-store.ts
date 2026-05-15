import { db } from "../../../infrastructure/db/index.ts";
import { deploymentSettings, deploymentSecrets } from "../../../../shared/schema.ts";
import { eq, and } from "drizzle-orm";
import type { AppSettings, AppSecret, AppSecretWithValue } from "../../types.ts";

function obfuscate(val: string): string {
  return Buffer.from(val).toString("base64");
}

function deobfuscate(val: string): string {
  try { return Buffer.from(val, "base64").toString("utf8"); } catch { return ""; }
}

const DEFAULT_SETTINGS: Omit<AppSettings, "projectId"> = {
  appName: "my-app",
  environment: "production",
  region: "us-east-1",
  isPublic: true,
};

export class SettingsStore {
  async getSettings(projectId: number): Promise<AppSettings> {
    const [row] = await db
      .select()
      .from(deploymentSettings)
      .where(eq(deploymentSettings.projectId, projectId));
    if (!row) return { projectId, ...DEFAULT_SETTINGS };
    return {
      projectId,
      appName: row.appName,
      environment: row.environment as AppSettings["environment"],
      region: row.region,
      isPublic: row.isPublic,
      dbUrl: row.dbUrl ?? undefined,
    };
  }

  async upsertSettings(settings: AppSettings): Promise<AppSettings> {
    const existing = await db
      .select()
      .from(deploymentSettings)
      .where(eq(deploymentSettings.projectId, settings.projectId));

    if (existing.length > 0) {
      await db
        .update(deploymentSettings)
        .set({
          appName: settings.appName,
          environment: settings.environment,
          region: settings.region,
          isPublic: settings.isPublic,
          dbUrl: settings.dbUrl ?? null,
          updatedAt: new Date(),
        })
        .where(eq(deploymentSettings.projectId, settings.projectId));
    } else {
      await db.insert(deploymentSettings).values({
        projectId: settings.projectId,
        appName: settings.appName,
        environment: settings.environment,
        region: settings.region,
        isPublic: settings.isPublic,
        dbUrl: settings.dbUrl ?? null,
      });
    }
    return settings;
  }

  async listSecrets(projectId: number): Promise<AppSecret[]> {
    const rows = await db
      .select()
      .from(deploymentSecrets)
      .where(eq(deploymentSecrets.projectId, projectId));
    return rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      key: r.key,
      createdAt: r.createdAt.getTime(),
      updatedAt: r.updatedAt.getTime(),
    }));
  }

  async getSecretWithValue(projectId: number, secretId: number): Promise<AppSecretWithValue | null> {
    const [row] = await db
      .select()
      .from(deploymentSecrets)
      .where(and(eq(deploymentSecrets.id, secretId), eq(deploymentSecrets.projectId, projectId)));
    if (!row) return null;
    return {
      id: row.id,
      projectId: row.projectId,
      key: row.key,
      value: deobfuscate(row.encryptedValue),
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
    };
  }

  async addSecret(projectId: number, key: string, value: string): Promise<AppSecret> {
    const [row] = await db
      .insert(deploymentSecrets)
      .values({ projectId, key: key.trim().toUpperCase(), encryptedValue: obfuscate(value) })
      .returning();
    return { id: row.id, projectId: row.projectId, key: row.key, createdAt: row.createdAt.getTime(), updatedAt: row.updatedAt.getTime() };
  }

  async updateSecret(projectId: number, secretId: number, value: string): Promise<boolean> {
    const result = await db
      .update(deploymentSecrets)
      .set({ encryptedValue: obfuscate(value), updatedAt: new Date() })
      .where(and(eq(deploymentSecrets.id, secretId), eq(deploymentSecrets.projectId, projectId)))
      .returning();
    return result.length > 0;
  }

  async deleteSecret(projectId: number, secretId: number): Promise<boolean> {
    const result = await db
      .delete(deploymentSecrets)
      .where(and(eq(deploymentSecrets.id, secretId), eq(deploymentSecrets.projectId, projectId)))
      .returning();
    return result.length > 0;
  }
}

export const settingsStore = new SettingsStore();
