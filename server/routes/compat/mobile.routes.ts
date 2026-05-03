import { Router, type Request, type Response } from "express";

export function registerMobileRoutes(r: Router): void {
  r.post("/api/mobile/crash/parse", async (req: Request, res: Response) => {
    const { stack = "" } = (req.body || {}) as { stack?: string };
    const lines = String(stack).split("\n").filter(Boolean);
    res.json({
      ok: true,
      data: {
        framesParsed: lines.length,
        topFrame: lines[0] || null,
        summary: lines.slice(0, 5),
      },
    });
  });
}
