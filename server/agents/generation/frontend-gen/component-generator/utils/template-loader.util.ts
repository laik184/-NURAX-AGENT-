import type { ComponentPlan } from "../types.js";

const REACT_TEMPLATES = {
  card: `
<section className="{{rootClass}}">
  <header className="{{headerClass}}">{{componentName}}</header>
  <div className="{{bodyClass}}">{children}</div>
</section>
`,
  form: `
<form className="{{rootClass}}" onSubmit={onSubmit}>
  <h2 className="{{headerClass}}">{{componentName}}</h2>
  {children}
</form>
`,
  modal: `
<div className="{{overlayClass}}">
  <div className="{{rootClass}}" role="dialog" aria-modal="true">
    <header className="{{headerClass}}">{{componentName}}</header>
    <div className="{{bodyClass}}">{children}</div>
  </div>
</div>
`,
} as const;

const VUE_TEMPLATES = {
  card: `<section :class="rootClass"><header :class="headerClass">{{ title }}</header><slot /></section>`,
  form: `<form :class="rootClass" @submit.prevent="onSubmit"><slot /></form>`,
  modal: `<div :class="overlayClass"><div :class="rootClass" role="dialog" aria-modal="true"><slot /></div></div>`,
} as const;

export function loadTemplate(plan: Readonly<ComponentPlan>): string {
  if (plan.framework === "vue") {
    return VUE_TEMPLATES[plan.variant];
  }
  return REACT_TEMPLATES[plan.variant];
}
