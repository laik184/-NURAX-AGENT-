import type { ComponentMeta, TestCase } from "../types.js";
import { buildCoreAssertion } from "../utils/assertion-builder.util.js";
import { buildFormSelectors } from "../utils/selector.util.js";

export function generateFormTests(meta: ComponentMeta): readonly TestCase[] {
  const selectors = buildFormSelectors();

  return Object.freeze([
    {
      id: `${meta.name}-form-inputs`,
      title: "accepts user input",
      arrange: `render(<${meta.name} />);`,
      act: "await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'qa@example.com');",
      assert: "expect(screen.getByDisplayValue('qa@example.com')).toBeInTheDocument();",
      tags: Object.freeze(["form", "inputs"]),
    },
    {
      id: `${meta.name}-form-submit`,
      title: "validates and submits form",
      arrange: `render(<${meta.name} />);`,
      act: `await userEvent.click(screen.getByRole('${selectors.submitButtonRole}', { name: ${selectors.submitButtonName} }));`,
      assert: buildCoreAssertion("form", meta.name),
      tags: Object.freeze(["form", "validation", "submit"]),
    },
  ]);
}
