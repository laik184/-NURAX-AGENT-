import type { SecurityIssue, SecurityScanResult, ScanStatus, IssueSeverity, IssueState } from "../../types.ts";

const SEED_ISSUES: Omit<SecurityIssue, "deploymentId">[] = [
  { id: "i1", severity: "critical", title: "SQL Injection Vulnerability",        desc: "User input passed directly into database query without sanitisation.", state: "active" },
  { id: "i2", severity: "critical", title: "Exposed API Secret in Bundle",       desc: "STRIPE_SECRET_KEY detected in client-side JavaScript bundle.", state: "active" },
  { id: "i3", severity: "medium",   title: "Missing Content-Security-Policy",    desc: "No CSP header is set, allowing potential XSS attacks.", state: "active" },
  { id: "i4", severity: "medium",   title: "Outdated Dependency (axios 0.21)",   desc: "axios@0.21.1 has known SSRF vulnerability — upgrade to ≥1.6.0.", state: "active" },
  { id: "i5", severity: "low",      title: "HTTP Strict Transport Security Off", desc: "HSTS header not present. Connections may fall back to plain HTTP.", state: "active" },
  { id: "i6", severity: "low",      title: "X-Frame-Options Not Set",            desc: "App may be embeddable in iframes, enabling clickjacking.", state: "active" },
];

class IssueStore {
  private scans = new Map<number, SecurityScanResult>();

  initScan(deploymentId: number): void {
    this.scans.set(deploymentId, {
      deploymentId,
      status: "scanning",
      progress: 0,
      issues: [],
    });
  }

  updateProgress(deploymentId: number, progress: number, revealedCount: number): void {
    const scan = this.scans.get(deploymentId);
    if (!scan) return;
    scan.progress = Math.min(progress, 100);
    scan.issues = SEED_ISSUES.slice(0, revealedCount).map((s) => ({
      ...s,
      deploymentId,
      state: "active" as IssueState,
    }));
  }

  completeScan(deploymentId: number): void {
    const scan = this.scans.get(deploymentId);
    if (!scan) return;
    scan.status = "done";
    scan.progress = 100;
    scan.completedAt = Date.now();
    scan.issues = SEED_ISSUES.map((s) => ({
      ...s,
      deploymentId,
      state: "active" as IssueState,
    }));
  }

  getScan(deploymentId: number): SecurityScanResult | null {
    return this.scans.get(deploymentId) ?? null;
  }

  setIssueState(deploymentId: number, issueId: string, state: IssueState): boolean {
    const scan = this.scans.get(deploymentId);
    if (!scan) return false;
    const issue = scan.issues.find((i) => i.id === issueId);
    if (!issue) return false;
    issue.state = state;
    return true;
  }

  getIssueCounts(deploymentId: number): { critical: number; medium: number; low: number; fixed: number } {
    const scan = this.scans.get(deploymentId);
    if (!scan) return { critical: 0, medium: 0, low: 0, fixed: 0 };
    const active = scan.issues.filter((i) => i.state !== "fixed");
    return {
      critical: active.filter((i) => i.severity === "critical").length,
      medium:   active.filter((i) => i.severity === "medium").length,
      low:      active.filter((i) => i.severity === "low").length,
      fixed:    scan.issues.filter((i) => i.state === "fixed").length,
    };
  }
}

export const issueStore = new IssueStore();
