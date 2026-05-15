import { issueStore } from "./issue-store.ts";
import { emitDeployEvent } from "../../events/deploy-events.ts";
import type { SecurityScanResult } from "../../types.ts";

const SCAN_STEPS = [
  "Initializing security scanner...",
  "Scanning dependency tree for known CVEs...",
  "Running static application security testing (SAST)...",
  "Checking for exposed secrets in source files...",
  "Auditing HTTP security headers configuration...",
  "Verifying Content-Security-Policy settings...",
  "Analysing authentication and session handling...",
  "Scanning complete.",
];

class SecurityScanner {
  private activeScans = new Map<number, ReturnType<typeof setTimeout>>();

  isScanning(deploymentId: number): boolean {
    return this.activeScans.has(deploymentId);
  }

  async runScan(
    deploymentId: number,
    onProgress: (pct: number, step: string) => void
  ): Promise<SecurityScanResult> {
    return new Promise((resolve) => {
      issueStore.initScan(deploymentId);
      let pct = 0;
      let stepIdx = 0;
      const SEED_LEN = 6;

      const tick = () => {
        pct += Math.random() * 12 + 5;
        const clampedPct = Math.min(pct, 100);
        const revealed = Math.floor(clampedPct / (100 / SEED_LEN));
        issueStore.updateProgress(deploymentId, clampedPct, revealed);

        const step = SCAN_STEPS[stepIdx] ?? SCAN_STEPS[SCAN_STEPS.length - 1];
        onProgress(clampedPct, step);
        stepIdx = Math.min(stepIdx + 1, SCAN_STEPS.length - 1);

        if (pct >= 100) {
          issueStore.completeScan(deploymentId);
          this.activeScans.delete(deploymentId);
          const result = issueStore.getScan(deploymentId)!;
          const counts = issueStore.getIssueCounts(deploymentId);
          emitDeployEvent({
            type: "deploy:scan:completed",
            deploymentId,
            issueCount: result.issues.length,
            criticalCount: counts.critical,
            ts: Date.now(),
          });
          resolve(result);
          return;
        }

        const delay = 300 + Math.random() * 250;
        const id = setTimeout(tick, delay);
        this.activeScans.set(deploymentId, id);
      };

      const id = setTimeout(tick, 200);
      this.activeScans.set(deploymentId, id);
    });
  }

  cancelScan(deploymentId: number): void {
    const id = this.activeScans.get(deploymentId);
    if (id) {
      clearTimeout(id);
      this.activeScans.delete(deploymentId);
    }
  }

  getScanResult(deploymentId: number): SecurityScanResult | null {
    return issueStore.getScan(deploymentId);
  }
}

export const securityScanner = new SecurityScanner();
