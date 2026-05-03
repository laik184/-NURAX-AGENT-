# Form Generator (HVP Compliant)

## 1) Module Overview
This module generates reusable frontend form component code from a typed schema. It produces:
- dynamic field markup,
- validation schema code (`zod`, `yup`, or custom style),
- submit handling with loading/success state,
- abstract API integration setup,
- error mapping helpers.

Primary entrypoint: `index.ts`.

## 2) Agent Responsibilities
- `agents/form-structure.agent.ts`: form sections/layout skeleton generation.
- `agents/input-field.agent.ts`: input field element generation (text/select/checkbox/textarea/etc.).
- `agents/validation-builder.agent.ts`: validation schema string generation.
- `agents/submit-handler.agent.ts`: submit-function code generation.
- `agents/api-integration.agent.ts`: API adapter config + API submission wrapper generation.
- `agents/error-handler.agent.ts`: submission/validation error mapping generation.

## 3) Flow Diagram
`orchestrator.ts` executes this strict flow:
1. receive `FormSchema`
2. `form-structure.agent`
3. `input-field.agent`
4. `validation-builder.agent`
5. `submit-handler.agent`
6. `api-integration.agent`
7. `error-handler.agent`
8. assemble final component
9. return frozen output

Diagram:

external caller
-> `index.ts`
-> `orchestrator.ts`
-> structure agent
-> fields agent
-> validation agent
-> submit agent
-> API agent
-> error agent
-> component assembly
-> frozen output

## 4) Import Relationships (HVP Layers)
- `types.ts`, `state.ts` = L0
- `orchestrator.ts` = L1
- `agents/*` = L2
- `utils/*` = L3

Rules enforced:
- downward-only imports
- no `agent -> agent` imports
- orchestrator owns state mutation (`state.ts` actor token gate)

## 5) Example Form Generation
Example input (abbreviated):
```ts
generateForm({
  formId: "signup",
  title: "Create account",
  validationEngine: "zod",
  fields: [
    {
      id: "email",
      name: "email",
      label: "Email",
      type: "email",
      validation: [
        { type: "required", message: "Email is required" },
        { type: "regex", value: "^.+@.+\\..+$", message: "Invalid email" }
      ]
    }
  ],
  submit: {
    method: "POST",
    endpoint: "/api/signup"
  }
});
```

Output shape:
```ts
{
  success: true,
  componentCode: "...generated component...",
  validationSchema: "...generated validation...",
  apiConfig: { endpoint: "/api/signup", method: "POST", headers: { ... } },
  logs: ["..."]
}
```
