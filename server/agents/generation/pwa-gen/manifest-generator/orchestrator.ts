import { buildBaseManifest } from "./agents/manifest-builder.agent.js";
import { generateIconConfig } from "./agents/icon-config.agent.js";
import { generateShortcuts } from "./agents/shortcut-generator.agent.js";
import { generateScreenshotConfig } from "./agents/screenshot-config.agent.js";
import { appendError, appendStep, appendWarning, createInitialState } from "./state.js";
import type { InstallableManifest, ManifestInput, ManifestOutput } from "./types.js";
import { deepFreeze } from "./utils/deep-freeze.util.js";
import {
  sanitizeColor,
  validateManifest,
  validateManifestInput,
} from "./utils/manifest-validator.util.js";

const DEFAULT_THEME_COLOR = "#0f172a";
const DEFAULT_BACKGROUND_COLOR = "#ffffff";

function withColors(
  manifest: Readonly<InstallableManifest>,
  themeColor: string,
  backgroundColor: string,
): InstallableManifest {
  return Object.freeze({
    ...manifest,
    theme_color: themeColor,
    background_color: backgroundColor,
  });
}

function withIcons(
  manifest: Readonly<InstallableManifest>,
  icons: InstallableManifest["icons"],
): InstallableManifest {
  return Object.freeze({ ...manifest, icons: [...icons] });
}

function withShortcuts(
  manifest: Readonly<InstallableManifest>,
  shortcuts: InstallableManifest["shortcuts"],
): InstallableManifest {
  return Object.freeze({ ...manifest, shortcuts: [...shortcuts] });
}

function withScreenshots(
  manifest: Readonly<InstallableManifest>,
  screenshots: InstallableManifest["screenshots"],
): InstallableManifest {
  return Object.freeze({ ...manifest, screenshots: [...screenshots] });
}

export function generateManifest(input: Readonly<ManifestInput>): ManifestOutput {
  let state = createInitialState();

  try {
    if (!input.appName.trim()) {
      throw new Error("appName cannot be empty.");
    }

    const inputErrors = validateManifestInput(input);
    if (inputErrors.length > 0) {
      for (const issue of inputErrors) {
        state = appendError(state, issue);
      }

      return Object.freeze({
        success: false,
        logs: [...state.steps, ...state.warnings, ...state.errors],
        error: state.errors.join(" "),
        manifest: Object.freeze({}),
      });
    }

    state = appendStep(state, "Input validated");

    let manifest = buildBaseManifest(input);
    state = appendStep(state, "Base manifest built");

    const sanitizedTheme = sanitizeColor(input.themeColor, DEFAULT_THEME_COLOR);
    const sanitizedBackground = sanitizeColor(input.backgroundColor, DEFAULT_BACKGROUND_COLOR);

    manifest = withColors(manifest, sanitizedTheme, sanitizedBackground);

    if (sanitizedTheme !== input.themeColor) {
      state = appendWarning(state, `Invalid themeColor provided. Applied fallback ${DEFAULT_THEME_COLOR}.`);
    }

    if (sanitizedBackground !== input.backgroundColor) {
      state = appendWarning(
        state,
        `Invalid backgroundColor provided. Applied fallback ${DEFAULT_BACKGROUND_COLOR}.`,
      );
    }

    const icons = generateIconConfig(input.icons);
    manifest = withIcons(manifest, icons);
    state = appendStep(state, "Icons configured");

    const shortcuts = generateShortcuts(input.appName);
    manifest = withShortcuts(manifest, shortcuts);
    state = appendStep(state, "Shortcuts configured");

    const screenshots = generateScreenshotConfig();
    manifest = withScreenshots(manifest, screenshots);
    state = appendStep(state, "Screenshots configured");

    const finalErrors = validateManifest(manifest);
    if (finalErrors.length > 0) {
      for (const issue of finalErrors) {
        state = appendError(state, issue);
      }

      return Object.freeze({
        success: false,
        logs: [...state.steps, ...state.warnings, ...state.errors],
        error: state.errors.join(" "),
        manifest: deepFreeze({ ...manifest }),
      });
    }

    state = appendStep(state, "Final manifest validated");

    return Object.freeze({
      success: true,
      logs: [...state.steps, ...state.warnings],
      manifest: deepFreeze({ ...manifest }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected manifest generation error.";
    state = appendError(state, message);

    return Object.freeze({
      success: false,
      logs: [...state.steps, ...state.warnings, ...state.errors],
      error: message,
      manifest: Object.freeze({}),
    });
  }
}
