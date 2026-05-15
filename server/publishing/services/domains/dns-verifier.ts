import type { DnsRecord } from "../../types.ts";

const CNAME_TARGET = "nura-x-app.replit.app";
const A_RECORD_IP  = "76.76.21.21";

export function getDnsRecords(domain: string): DnsRecord[] {
  const apex = domain.replace(/^www\./, "");
  return [
    { type: "CNAME", name: "www",             value: CNAME_TARGET },
    { type: "A",     name: "@",               value: A_RECORD_IP  },
    { type: "TXT",   name: "_replit-verify",  value: `replit-verify=${apex.replace(/\./g, "-")}-ok` },
  ];
}

export function validateDomain(raw: string): { err: string; val: string } {
  const trimmed = raw.trim().toLowerCase().replace(/^https?:\/\//, "");
  if (!trimmed) return { err: "Please enter a domain name.", val: "" };
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(trimmed)) {
    return { err: "Invalid domain format (e.g. yoursite.com)", val: "" };
  }
  return { err: "", val: trimmed };
}

class DnsVerifier {
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  scheduleVerification(
    domainId: number,
    onVerifying: () => void,
    onConnected: () => void,
    onError?: () => void
  ): void {
    this.cancelVerification(domainId);
    const pendingDelay = 2000 + Math.random() * 1500;
    const t1 = setTimeout(() => {
      onVerifying();
      const verifyDelay = 4500 + Math.random() * 2000;
      const t2 = setTimeout(() => {
        if (Math.random() < 0.85) {
          onConnected();
        } else {
          onError?.();
        }
        this.timers.delete(domainId);
      }, verifyDelay);
      this.timers.set(domainId, t2);
    }, pendingDelay);
    this.timers.set(domainId, t1);
  }

  cancelVerification(domainId: number): void {
    const id = this.timers.get(domainId);
    if (id) { clearTimeout(id); this.timers.delete(domainId); }
  }

  cancelAll(): void {
    for (const [id] of this.timers) this.cancelVerification(id);
  }
}

export const dnsVerifier = new DnsVerifier();
