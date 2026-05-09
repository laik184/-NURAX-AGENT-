import type { Tool, ToolContext, ToolResult } from "../types.ts";

function getPreviewUrl(port: number): string {
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return `http://localhost:${port}`;
}

export const previewUrl: Tool = {
  name: "preview_url",
  description: "Get the public preview URL for the running project app.",
  parameters: {
    type: "object",
    properties: {
      port: { type: "number", description: "Port (default: auto-detect from running server)" },
    },
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const port = (args.port as number) || (5000 + (ctx.projectId % 1000));
    const url = getPreviewUrl(port);
    return {
      ok: true,
      result: { url, port, message: `Preview available at: ${url}` },
    };
  },
};

export const previewScreenshot: Tool = {
  name: "preview_screenshot",
  description: "Take a screenshot of the running app preview. Returns the preview URL.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Page path to screenshot (default '/')" },
      port: { type: "number", description: "Server port (default: auto-detect)" },
    },
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const port = (args.port as number) || (5000 + (ctx.projectId % 1000));
    const pagePath = (args.path as string) || "/";
    const url = getPreviewUrl(port) + pagePath;

    try {
      const puppeteer = await import("puppeteer").catch(() => null);
      if (!puppeteer) {
        return { ok: true, result: { previewUrl: url, screenshot: null, message: "Puppeteer not available. Preview URL provided." } };
      }
      const browser = await puppeteer.default.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      await page.goto(url, { waitUntil: "networkidle2", timeout: 15_000 });
      const screenshotBase64 = await page.screenshot({ encoding: "base64" });
      await browser.close();
      return { ok: true, result: { previewUrl: url, screenshot: screenshotBase64, format: "base64/png" } };
    } catch (e: any) {
      return { ok: true, result: { previewUrl: url, screenshot: null, message: `Screenshot failed: ${e.message}` } };
    }
  },
};
