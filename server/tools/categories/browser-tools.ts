import type { Tool, ToolContext, ToolResult } from "../types.ts";
import { runtimeManager } from "../../infrastructure/runtime/runtime-manager.ts";

export const browserNavigate: Tool = {
  name: "browser_navigate",
  description: "Navigate to a URL in a headless browser and return page title, content, and screenshot (if Puppeteer is available).",
  parameters: {
    type: "object",
    properties: {
      url:       { type: "string",  description: "URL to navigate to" },
      selector:  { type: "string",  description: "CSS selector to wait for before capturing (optional)" },
      timeout:   { type: "number",  description: "Navigation timeout in ms (default 15000)" },
    },
    required: ["url"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const url       = args.url as string;
    const selector  = args.selector as string | undefined;
    const timeout   = (args.timeout as number) || 15_000;

    const puppeteer = await import("puppeteer").catch(() => null);
    if (!puppeteer) {
      return { ok: false, error: "Puppeteer is not installed. Run: npm install puppeteer" };
    }

    try {
      const browser = await puppeteer.default.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const page    = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      await page.goto(url, { waitUntil: "networkidle2", timeout });
      if (selector) await page.waitForSelector(selector, { timeout: 5_000 }).catch(() => null);
      const title   = await page.title();
      const content = await page.content();
      const screenshot = await page.screenshot({ encoding: "base64" });
      await browser.close();
      return { ok: true, result: { url, title, contentLength: content.length, screenshot, format: "base64/png" } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};

export const browserClick: Tool = {
  name: "browser_click",
  description: "Click an element matching a CSS selector in the running project preview.",
  parameters: {
    type: "object",
    properties: {
      selector: { type: "string", description: "CSS selector for the element to click" },
      path:     { type: "string", description: "Preview page path (default '/')" },
    },
    required: ["selector"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const port = runtimeManager.getPort(ctx.projectId);
    if (!port) return { ok: false, error: "No server running. Call server_start first." };

    const previewUrl = runtimeManager.previewUrl(ctx.projectId, port);
    const pagePath   = (args.path as string) || "/";
    const url        = previewUrl + (pagePath.startsWith("/") ? pagePath.slice(1) : pagePath);

    const puppeteer  = await import("puppeteer").catch(() => null);
    if (!puppeteer) return { ok: false, error: "Puppeteer not installed. Run: npm install puppeteer" };

    try {
      const browser = await puppeteer.default.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const page    = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle2", timeout: 15_000 });
      await page.click(args.selector as string);
      const screenshot = await page.screenshot({ encoding: "base64" });
      await browser.close();
      return { ok: true, result: { clicked: args.selector, screenshot, format: "base64/png" } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};

export const browserFill: Tool = {
  name: "browser_fill",
  description: "Type text into an input matching a CSS selector in the running project preview.",
  parameters: {
    type: "object",
    properties: {
      selector: { type: "string", description: "CSS selector for the input field" },
      value:    { type: "string", description: "Text to type" },
      path:     { type: "string", description: "Preview page path (default '/')" },
      submit:   { type: "boolean", description: "Press Enter after typing (default false)" },
    },
    required: ["selector", "value"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const port = runtimeManager.getPort(ctx.projectId);
    if (!port) return { ok: false, error: "No server running. Call server_start first." };

    const previewUrl = runtimeManager.previewUrl(ctx.projectId, port);
    const pagePath   = (args.path as string) || "/";
    const url        = previewUrl + (pagePath.startsWith("/") ? pagePath.slice(1) : pagePath);

    const puppeteer  = await import("puppeteer").catch(() => null);
    if (!puppeteer) return { ok: false, error: "Puppeteer not installed. Run: npm install puppeteer" };

    try {
      const browser = await puppeteer.default.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const page    = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle2", timeout: 15_000 });
      await page.type(args.selector as string, args.value as string);
      if (args.submit) await page.keyboard.press("Enter");
      const screenshot = await page.screenshot({ encoding: "base64" });
      await browser.close();
      return { ok: true, result: { filled: args.selector, value: args.value, screenshot } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};
