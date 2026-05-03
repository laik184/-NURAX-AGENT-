import type { ComponentMeta, TestCase } from "../types.js";
import { buildCoreAssertion } from "../utils/assertion-builder.util.js";
import { buildRootTestId } from "../utils/selector.util.js";

export function generateComponentTests(meta: ComponentMeta): readonly TestCase[] {
  const rootTestId = buildRootTestId(meta);

  return Object.freeze([
    {
      id: `${meta.name}-render`,
      title: "renders component root",
      arrange: `render(<${meta.name} />);`,
      act: "",
      assert: `expect(screen.getByTestId('${rootTestId}')).toBeInTheDocument();`,
      tags: Object.freeze(["render", "component"]),
    },
    {
      id: `${meta.name}-props`,
      title: "renders expected props",
      arrange: `render(<${meta.name} title=\"Sample\" />);`,
      act: "",
      assert: buildCoreAssertion("component", meta.name),
      tags: Object.freeze(["props", "component"]),
    },
  ]);
}
