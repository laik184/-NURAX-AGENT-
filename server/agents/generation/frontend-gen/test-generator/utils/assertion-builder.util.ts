import type { SupportedFramework, TestType } from "../types.js";

export function buildFrameworkImports(framework: SupportedFramework): readonly string[] {
  if (framework === "vue") {
    return Object.freeze([
      "import { describe, it, expect, vi } from 'vitest';",
      "import { render, screen } from '@testing-library/vue';",
      "import userEvent from '@testing-library/user-event';",
    ]);
  }

  return Object.freeze([
    "import { describe, it, expect, vi } from 'vitest';",
    "import { render, screen } from '@testing-library/react';",
    "import userEvent from '@testing-library/user-event';",
  ]);
}

export function buildCoreAssertion(testType: TestType, componentName: string): string {
  switch (testType) {
    case "page":
      return `expect(screen.getByTestId('${componentName.toLowerCase()}-page')).toBeInTheDocument();`;
    case "form":
      return "expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();";
    case "api":
      return "expect(global.fetch).toHaveBeenCalled();";
    case "interaction":
      return "expect(screen.getByText(/updated/i)).toBeInTheDocument();";
    default:
      return `expect(screen.getByTestId('${componentName.toLowerCase()}-root')).toBeInTheDocument();`;
  }
}
