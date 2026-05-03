import type { ComponentPlan, GeneratedFile, PropsDefinition } from "../types.js";
import { buildFilePath } from "../utils/file-structure.util.js";
import { formatCode } from "../utils/formatter.util.js";

function replaceToken(source: string, token: string, value: string): string {
  return source.split(token).join(value);
}

function buildReactComponent(
  plan: Readonly<ComponentPlan>,
  propsDef: Readonly<PropsDefinition>,
  template: string,
): string {
  const propTypeLines = propsDef.props.map((prop) =>
    `  ${prop.name}${prop.required ? "" : "?"}: ${prop.type};`).join("\n");

  const classImports = plan.styleStrategy === "css"
    ? `import "./${plan.styleFileName}";\n`
    : "";

  let hydratedTemplate = template;
  hydratedTemplate = replaceToken(hydratedTemplate, "{{componentName}}", plan.normalizedName);
  hydratedTemplate = replaceToken(hydratedTemplate, "{{rootClass}}", "rounded-xl border border-slate-200 bg-white p-4");
  hydratedTemplate = replaceToken(hydratedTemplate, "{{headerClass}}", "text-base font-semibold");
  hydratedTemplate = replaceToken(hydratedTemplate, "{{bodyClass}}", "mt-3 text-sm");
  hydratedTemplate = replaceToken(hydratedTemplate, "{{overlayClass}}", "fixed inset-0 bg-slate-900/40 p-6");

  return formatCode(`
import type { ReactNode } from "react";
${classImports}
export interface ${propsDef.interfaceName} {
${propTypeLines || "  children?: ReactNode;"}
  children?: ReactNode;
}

export function ${plan.normalizedName}(props: ${propsDef.interfaceName}) {
  const ${propsDef.signature} = props;
  return (
    ${hydratedTemplate}
  );
}
`);
}

function buildVueComponent(plan: Readonly<ComponentPlan>, template: string): string {
  let hydratedTemplate = template;
  hydratedTemplate = replaceToken(hydratedTemplate, "{{ title }}", plan.normalizedName);
  hydratedTemplate = replaceToken(hydratedTemplate, "{{componentName}}", plan.normalizedName);

  return formatCode(`
<template>
  ${hydratedTemplate}
</template>

<script setup lang="ts">
const rootClass = "rounded-xl border border-slate-200 bg-white p-4";
const headerClass = "text-base font-semibold";
const overlayClass = "fixed inset-0 bg-slate-900/40 p-6";
const onSubmit = () => undefined;
</script>
`);
}

export function generateComponentFile(
  plan: Readonly<ComponentPlan>,
  propsDef: Readonly<PropsDefinition>,
  template: string,
): GeneratedFile {
  const content = plan.framework === "vue"
    ? buildVueComponent(plan, template)
    : buildReactComponent(plan, propsDef, template);

  return Object.freeze({
    path: buildFilePath(plan, plan.componentFileName),
    content,
    language: plan.framework === "vue" ? "vue" : "tsx",
  });
}
