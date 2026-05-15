import { Router, type Request, type Response } from "express";
import { db } from "../infrastructure/db/index.ts";
import { projects } from "../../shared/schema.ts";
import { eq } from "drizzle-orm";
import {
  startDeployment, getDeployment, listDeployments,
  runtimeStatus, logStore, metricsCollector,
  securityScanner, issueStore,
  domainManager, getDnsRecords,
  settingsStore, authConfigStore,
} from "../publishing/index.ts";
import type { MetricRange, IssueState, AuthProvider } from "../publishing/types.ts";

export function createPublishingRouter(): Router {
  const router = Router();

  router.get("/status/:projectId", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
      if (!project) return res.status(404).json({ ok: false, error: "Project not found" });
      const deploys = await listDeployments(projectId);
      const current = deploys[deploys.length - 1] ?? null;
      res.json({ ok: true, projectId, status: current?.status ?? "idle", deployment: current });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.post("/publish/:projectId", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
      if (!project) return res.status(404).json({ ok: false, error: "Project not found" });
      const settings = await settingsStore.getSettings(projectId);
      const deployment = await startDeployment(projectId, {
        appName: settings.appName,
        region: settings.region,
        environment: settings.environment,
      });
      res.json({ ok: true, deployment });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.get("/deployments/:projectId", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const deploys = await listDeployments(projectId);
      res.json({ ok: true, deployments: deploys });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.get("/deployments/:projectId/current", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const deploys = await listDeployments(projectId);
      const current = deploys[deploys.length - 1] ?? null;
      res.json({ ok: true, deployment: current });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.get("/deployments/:deploymentId/logs", (req: Request, res: Response) => {
    try {
      const deploymentId = Number(req.params.deploymentId);
      const { level, search, limit, offset } = req.query as Record<string, string>;
      const entries = logStore.query(deploymentId, {
        level: level as any,
        search,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });
      res.json({ ok: true, logs: entries, counts: logStore.levelCounts(deploymentId) });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.get("/deployments/:deploymentId/resources", (req: Request, res: Response) => {
    try {
      const deploymentId = Number(req.params.deploymentId);
      const range = (req.query.range as MetricRange) ?? "5m";
      const metrics = metricsCollector.getMetrics(deploymentId, range);
      const stats = metricsCollector.getCurrentStats(deploymentId);
      res.json({ ok: true, range, metrics, current: stats });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.get("/deployments/:projectId/domains", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const domains = await domainManager.listDomains(projectId);
      res.json({ ok: true, domains });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.post("/deployments/:projectId/domains", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const { name } = req.body as { name: string };
      if (!name) return res.status(400).json({ ok: false, error: "name is required" });
      const result = await domainManager.addDomain(projectId, name);
      if ("err" in result) return res.status(400).json({ ok: false, error: result.err });
      const records = getDnsRecords(result.name);
      res.json({ ok: true, domain: result, dnsRecords: records });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.delete("/deployments/:projectId/domains/:domainId", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const domainId = Number(req.params.domainId);
      const ok = await domainManager.removeDomain(projectId, domainId);
      res.json({ ok });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.post("/deployments/:projectId/domains/:domainId/retry", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const domainId = Number(req.params.domainId);
      const ok = await domainManager.retryDomain(projectId, domainId);
      res.json({ ok });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.get("/deployments/:deploymentId/security-scan", (req: Request, res: Response) => {
    const deploymentId = Number(req.params.deploymentId);
    const result = securityScanner.getScanResult(deploymentId);
    res.json({ ok: true, scan: result });
  });

  router.post("/deployments/:deploymentId/security-scan", (req: Request, res: Response) => {
    const deploymentId = Number(req.params.deploymentId);
    if (securityScanner.isScanning(deploymentId)) {
      return res.status(409).json({ ok: false, error: "Scan already in progress" });
    }
    securityScanner.runScan(deploymentId, () => {});
    res.json({ ok: true, message: "Scan started" });
  });

  router.patch("/deployments/:deploymentId/security-scan/issues/:issueId", (req: Request, res: Response) => {
    const deploymentId = Number(req.params.deploymentId);
    const { issueId } = req.params;
    const { state } = req.body as { state: IssueState };
    if (!["active", "hidden", "fixed"].includes(state)) {
      return res.status(400).json({ ok: false, error: "Invalid state" });
    }
    const ok = issueStore.setIssueState(deploymentId, issueId, state);
    res.json({ ok, counts: issueStore.getIssueCounts(deploymentId) });
  });

  router.get("/deployments/:projectId/settings", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const settings = await settingsStore.getSettings(projectId);
      res.json({ ok: true, settings });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.put("/deployments/:projectId/settings", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const settings = await settingsStore.upsertSettings({ ...req.body, projectId });
      res.json({ ok: true, settings });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.get("/deployments/:projectId/secrets", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const secrets = await settingsStore.listSecrets(projectId);
      res.json({ ok: true, secrets });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.post("/deployments/:projectId/secrets", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const { key, value } = req.body as { key: string; value: string };
      if (!key || !value) return res.status(400).json({ ok: false, error: "key and value are required" });
      const secret = await settingsStore.addSecret(projectId, key, value);
      res.json({ ok: true, secret });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.put("/deployments/:projectId/secrets/:secretId", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const secretId = Number(req.params.secretId);
      const { value } = req.body as { value: string };
      if (!value) return res.status(400).json({ ok: false, error: "value is required" });
      const ok = await settingsStore.updateSecret(projectId, secretId, value);
      res.json({ ok });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.delete("/deployments/:projectId/secrets/:secretId", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const secretId = Number(req.params.secretId);
      const ok = await settingsStore.deleteSecret(projectId, secretId);
      res.json({ ok });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.get("/deployments/:projectId/auth", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const config = await authConfigStore.getConfig(projectId);
      res.json({ ok: true, config });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.put("/deployments/:projectId/auth", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const config = await authConfigStore.upsertConfig({ ...req.body, projectId });
      res.json({ ok: true, config });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.patch("/deployments/:projectId/auth/providers/:providerId", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const providerId = req.params.providerId as AuthProvider;
      const { enabled } = req.body as { enabled: boolean };
      const config = await authConfigStore.toggleProvider(projectId, providerId, enabled);
      res.json({ ok: true, config });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.get("/deployments/:deploymentId/manage/status", (req: Request, res: Response) => {
    const deploymentId = Number(req.params.deploymentId);
    const status = runtimeStatus.getStatus(deploymentId);
    res.json({ ok: true, ...status });
  });

  router.post("/deployments/:deploymentId/manage/restart", (req: Request, res: Response) => {
    const deploymentId = Number(req.params.deploymentId);
    runtimeStatus.restart(deploymentId);
    res.json({ ok: true, action: "restart" });
  });

  router.post("/deployments/:deploymentId/manage/redeploy", async (req: Request, res: Response) => {
    try {
      const deploymentId = Number(req.params.deploymentId);
      const existing = await getDeployment(deploymentId);
      if (!existing) return res.status(404).json({ ok: false, error: "Deployment not found" });
      runtimeStatus.redeploy(deploymentId);
      res.json({ ok: true, action: "redeploy" });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.post("/deployments/:deploymentId/manage/shutdown", (req: Request, res: Response) => {
    const deploymentId = Number(req.params.deploymentId);
    runtimeStatus.shutdown(deploymentId);
    res.json({ ok: true, action: "shutdown" });
  });

  return router;
}
