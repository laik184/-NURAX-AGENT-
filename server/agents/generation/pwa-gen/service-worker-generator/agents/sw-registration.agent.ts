import type { RegistrationBuildResult } from "../types.js";

export function runSwRegistrationAgent(): Readonly<RegistrationBuildResult> {
  return Object.freeze({
    script: [
      "if (\"serviceWorker\" in navigator) {",
      "  window.addEventListener(\"load\", async () => {",
      "    const registration = await navigator.serviceWorker.register(\"/sw.js\");",
      "    if (registration.waiting) {",
      "      console.info(\"Service worker update available.\");",
      "    }",
      "    registration.addEventListener(\"updatefound\", () => {",
      "      console.info(\"Service worker update detected.\");",
      "    });",
      "  });",
      "}",
    ].join("\n"),
    logs: Object.freeze([
      "sw-registration: generated register('/sw.js') snippet",
      "sw-registration: attached update detection hooks",
    ]),
  });
}
