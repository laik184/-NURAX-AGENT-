import type { MetricPoint, MetricRange } from "../../types.ts";

interface RingBuffer {
  points: MetricPoint[];
  maxSize: number;
}

class MetricsCollector {
  private buffers = new Map<number, RingBuffer>();
  private tickers = new Map<number, ReturnType<typeof setInterval>>();

  private getBuffer(deploymentId: number): RingBuffer {
    if (!this.buffers.has(deploymentId)) {
      this.buffers.set(deploymentId, { points: [], maxSize: 1440 });
    }
    return this.buffers.get(deploymentId)!;
  }

  private makePoint(lastCpu: number, lastMem: number): MetricPoint {
    const cpu = Math.max(5, Math.min(98,
      lastCpu + (Math.random() - 0.47) * 10 + (Math.random() < 0.06 ? 25 : 0)
    ));
    const mem = Math.max(80, Math.min(502,
      lastMem + (Math.random() - 0.45) * 14
    ));
    const now = new Date();
    return {
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      cpu: Math.round(cpu * 10) / 10,
      mem: Math.round(mem),
    };
  }

  startTracking(deploymentId: number): void {
    if (this.tickers.has(deploymentId)) return;
    const buf = this.getBuffer(deploymentId);
    let cpu = 30 + Math.random() * 20;
    let mem = 200 + Math.random() * 80;
    const tick = () => {
      const pt = this.makePoint(cpu, mem);
      cpu = pt.cpu;
      mem = pt.mem;
      buf.points.push(pt);
      if (buf.points.length > buf.maxSize) buf.points.shift();
    };
    tick();
    const id = setInterval(tick, 10_000);
    this.tickers.set(deploymentId, id);
  }

  stopTracking(deploymentId: number): void {
    const id = this.tickers.get(deploymentId);
    if (id) { clearInterval(id); this.tickers.delete(deploymentId); }
  }

  getMetrics(deploymentId: number, range: MetricRange): MetricPoint[] {
    const buf = this.getBuffer(deploymentId);
    const count = range === "5m" ? 30 : range === "1h" ? 60 : 48;
    if (buf.points.length === 0) {
      return this.generateSeedData(range);
    }
    return buf.points.slice(-count);
  }

  getCurrentStats(deploymentId: number): { cpu: number; mem: number } {
    const buf = this.getBuffer(deploymentId);
    const last = buf.points[buf.points.length - 1];
    return last ? { cpu: last.cpu, mem: last.mem } : { cpu: 0, mem: 0 };
  }

  private generateSeedData(range: MetricRange): MetricPoint[] {
    const count = range === "5m" ? 30 : range === "1h" ? 60 : 48;
    const stepMs = range === "5m" ? 10_000 : range === "1h" ? 60_000 : 1_800_000;
    const now = Date.now();
    let cpu = 30 + Math.random() * 20;
    let mem = 200 + Math.random() * 80;
    return Array.from({ length: count }, (_, i) => {
      const t = new Date(now - (count - 1 - i) * stepMs);
      cpu = Math.max(5, Math.min(98, cpu + (Math.random() - 0.47) * 12 + (Math.random() < 0.07 ? 28 : 0)));
      mem = Math.max(80, Math.min(502, mem + (Math.random() - 0.45) * 18));
      const label = range === "5m"
        ? t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        : t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return { time: label, cpu: Math.round(cpu * 10) / 10, mem: Math.round(mem) };
    });
  }
}

export const metricsCollector = new MetricsCollector();
