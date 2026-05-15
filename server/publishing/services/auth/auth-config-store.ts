import { db } from "../../../infrastructure/db/index.ts";
import { deploymentAuthConfig } from "../../../../shared/schema.ts";
import { eq } from "drizzle-orm";
import type { AuthConfig, ProviderConfig, AuthProvider } from "../../types.ts";

const DEFAULT_PROVIDERS: ProviderConfig[] = [
  { id: "email",   enabled: true  },
  { id: "google",  enabled: true  },
  { id: "github",  enabled: false },
  { id: "discord", enabled: false },
];

const DEFAULT_CONFIG: Omit<AuthConfig, "projectId"> = {
  providers: DEFAULT_PROVIDERS,
  requireEmailVerif: true,
  sessionExpiry: "7d",
};

export class AuthConfigStore {
  async getConfig(projectId: number): Promise<AuthConfig> {
    const [row] = await db
      .select()
      .from(deploymentAuthConfig)
      .where(eq(deploymentAuthConfig.projectId, projectId));

    if (!row) return { projectId, ...DEFAULT_CONFIG };

    return {
      projectId,
      providers: row.providers as ProviderConfig[],
      requireEmailVerif: row.requireEmailVerif,
      sessionExpiry: row.sessionExpiry as AuthConfig["sessionExpiry"],
    };
  }

  async upsertConfig(config: AuthConfig): Promise<AuthConfig> {
    const existing = await db
      .select()
      .from(deploymentAuthConfig)
      .where(eq(deploymentAuthConfig.projectId, config.projectId));

    const providerIds: AuthProvider[] = ["email", "google", "github", "discord"];
    const providers: ProviderConfig[] = providerIds.map((id) => {
      const match = config.providers.find((p) => p.id === id);
      return match ?? { id, enabled: false };
    });

    if (existing.length > 0) {
      await db
        .update(deploymentAuthConfig)
        .set({
          providers,
          requireEmailVerif: config.requireEmailVerif,
          sessionExpiry: config.sessionExpiry,
          updatedAt: new Date(),
        })
        .where(eq(deploymentAuthConfig.projectId, config.projectId));
    } else {
      await db.insert(deploymentAuthConfig).values({
        projectId: config.projectId,
        providers,
        requireEmailVerif: config.requireEmailVerif,
        sessionExpiry: config.sessionExpiry,
      });
    }

    return { ...config, providers };
  }

  async toggleProvider(projectId: number, providerId: AuthProvider, enabled: boolean): Promise<AuthConfig> {
    const config = await this.getConfig(projectId);
    const providers = config.providers.map((p) =>
      p.id === providerId ? { ...p, enabled } : p
    );
    return this.upsertConfig({ ...config, providers });
  }
}

export const authConfigStore = new AuthConfigStore();
