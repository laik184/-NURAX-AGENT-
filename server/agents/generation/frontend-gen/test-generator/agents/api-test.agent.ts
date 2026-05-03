import type { ComponentMeta, TestCase } from "../types.js";
import { buildCoreAssertion } from "../utils/assertion-builder.util.js";

export function generateApiTests(meta: ComponentMeta): readonly TestCase[] {
  return Object.freeze([
    {
      id: `${meta.name}-api-success`,
      title: "handles successful API response",
      arrange:
        "global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) }) as unknown as typeof fetch;\nrender(<ComponentUnderTest />);",
      act: "await userEvent.click(screen.getByRole('button', { name: /load/i }));",
      assert: buildCoreAssertion("api", meta.name),
      tags: Object.freeze(["api", "success"]),
    },
    {
      id: `${meta.name}-api-error`,
      title: "handles failed API response",
      arrange:
        "global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;\nrender(<ComponentUnderTest />);",
      act: "await userEvent.click(screen.getByRole('button', { name: /load/i }));",
      assert: "expect(screen.getByText(/error/i)).toBeInTheDocument();",
      tags: Object.freeze(["api", "error"]),
    },
  ]);
}
