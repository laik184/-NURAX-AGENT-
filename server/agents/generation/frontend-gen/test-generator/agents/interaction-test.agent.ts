import type { ComponentMeta, TestCase } from "../types.js";
import { buildCoreAssertion } from "../utils/assertion-builder.util.js";

export function generateInteractionTests(meta: ComponentMeta): readonly TestCase[] {
  return Object.freeze([
    {
      id: `${meta.name}-interaction-click`,
      title: "responds to click interactions",
      arrange: `render(<${meta.name} />);`,
      act: "await userEvent.click(screen.getByRole('button', { name: /toggle/i }));",
      assert: buildCoreAssertion("interaction", meta.name),
      tags: Object.freeze(["interaction", "click"]),
    },
    {
      id: `${meta.name}-interaction-type`,
      title: "responds to typing interactions",
      arrange: `render(<${meta.name} />);`,
      act: "await userEvent.type(screen.getByRole('textbox', { name: /search/i }), 'smoke');",
      assert: "expect(screen.getByDisplayValue('smoke')).toBeInTheDocument();",
      tags: Object.freeze(["interaction", "typing"]),
    },
  ]);
}
