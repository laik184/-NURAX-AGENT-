import type { ComponentMeta, TestCase } from "../types.js";
import { buildCoreAssertion } from "../utils/assertion-builder.util.js";
import { buildPageTestId } from "../utils/selector.util.js";

export function generatePageTests(meta: ComponentMeta): readonly TestCase[] {
  const pageTestId = buildPageTestId(meta);

  return Object.freeze([
    {
      id: `${meta.name}-page-render`,
      title: "renders page shell",
      arrange: `render(<${meta.name} />);`,
      act: "",
      assert: `expect(screen.getByTestId('${pageTestId}')).toBeInTheDocument();`,
      tags: Object.freeze(["page", "render"]),
    },
    {
      id: `${meta.name}-navigation`,
      title: "handles navigation entry points",
      arrange: "const navigate = vi.fn();\nrender(<Page navigation={navigate} />);",
      act: "await userEvent.click(screen.getByRole('link', { name: /next/i }));",
      assert: buildCoreAssertion("page", meta.name),
      tags: Object.freeze(["page", "navigation"]),
    },
  ]);
}
