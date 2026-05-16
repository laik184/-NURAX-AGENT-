/**
 * server/tools/categories/preview-tools.ts
 *
 * AI agent tools for querying the live preview URL and taking screenshots.
 * Port resolution delegates to runtimeManager — single source of truth.
 */

import { runtimeManager } from "../../infrastructure/runtime/runtime-manager.ts";
import type { Tool, ToolContext, ToolResult } from "../types.ts";

export const previewUrl: Tool = {
  name: "preview_url",
  description:
    "Get the public preview URL for the running project server. " +
    "Returns null if no server has been started yet — call server_start first.",
  parameters: { type: "object", properties: {} },

  async run(_args, ctx: ToolContext): Promise<ToolResult> {
    const port = runtimeManager.getPort(ctx.projectId);
    if (!port) {
      return { ok: true, result: { running: false, url: null, message: "No server is running. Call server_start first." } };
    }
    const url = runtimeManager.previewUrl(ctx.projectId, port);
    return { ok: true, result: { running: true, url, port, message: `Preview available at: ${url}` } };
  },
};

export const previewScreenshot: Tool = {
  name: "preview_screenshot",
  description: "Take a screenshot of the running app preview. Returns the preview URL even if Puppeteer is unavailable.",
  parameters: {
    type: "object",
    properties: { path: { type: "string", description: "Page path to screenshot (default '/')" } },
  },

  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const port = runtimeManager.getPort(ctx.projectId);
    if (!port) return { ok: false, error: "No server is running. Call server_start first." };

    const pagePath = (args.path as string) || "/";
    const base     = runtimeManager.previewUrl(ctx.projectId, port);
    const url      = base + (pagePath.startsWith("/") ? pagePath.slice(1) : pagePath);

    try {
      const puppeteer = await import("puppeteer").catch(() => null);
      if (!puppeteer) {
        return { ok: true, result: { previewUrl: url, screenshot: null, message: "Puppeteer not available — preview URL provided instead." } };
      }
      const browser = await puppeteer.default.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const page    = await browser.newPage();
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
