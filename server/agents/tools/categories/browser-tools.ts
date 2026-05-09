import type { Tool, ToolContext, ToolResult } from "../types.ts";

export const browserEval: Tool = {
  name: "browser_eval",
  description: "Evaluate JavaScript in a headless browser context using Puppeteer. Useful for testing browser-side code.",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL to navigate to before evaluating" },
      code: { type: "string", description: "JavaScript code to evaluate in the page context" },
      waitForSelector: { type: "string", description: "Wait for this CSS selector before evaluating" },
      timeoutMs: { type: "number", description: "Navigation timeout in ms (default 15000)" },
    },
    required: ["code"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const code = args.code as string;
    const url = args.url as string | undefined;
    const timeoutMs = (args.timeoutMs as number) || 15_000;

    try {
      const puppeteer = await import("puppeteer").catch(() => null);
      if (!puppeteer) {
        return {
          ok: false,
          error: "Puppeteer is not installed. Run: package_install({packages: ['puppeteer']})",
        };
      }

      const browser = await puppeteer.default.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        headless: true,
      });

      try {
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(timeoutMs);

        if (url) {
          await page.goto(url, { waitUntil: "networkidle2" });
        }

        if (args.waitForSelector) {
          await page.waitForSelector(args.waitForSelector as string, { timeout: timeoutMs });
        }

        const result = await page.evaluate(code);

        await browser.close();
        return { ok: true, result: { evaluated: true, result, url } };
      } finally {
        await browser.close().catch(() => {});
      }
    } catch (e: any) {
      return { ok: false, error: `Browser eval failed: ${e.message}` };
    }
  },
};
