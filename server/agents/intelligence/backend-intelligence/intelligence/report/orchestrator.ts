import { buildActionPlan } from "./agents/action.plan.agent.js";
import { formatReport } from "./agents/formatter.agent.js";
import { groupIssues } from "./agents/issue.grouping.agent.js";
import { generateSections } from "./agents/section.generator.agent.js";
import { buildSummary } from "./agents/summary.builder.agent.js";
import { createInitialReportState, withActions, withGroupedIssues, withSections, withSummary } from "./state.js";
import type { FinalReport, ReportInput } from "./types.js";
import { normalizeInputs } from "./utils/normalize.util.js";

export function buildBackendIntelligenceReport(input: ReportInput): FinalReport {
  let state = createInitialReportState(input);

  const normalizedInputs = normalizeInputs(input);
  const groupedIssues = groupIssues(normalizedInputs);
  state = withGroupedIssues(state, groupedIssues);

  const sections = generateSections(state.groupedIssues);
  state = withSections(state, sections);

  const summary = buildSummary(state.groupedIssues, state.sections);
  state = withSummary(state, summary);

  const actions = buildActionPlan(state.groupedIssues);
  state = withActions(state, actions);

  return formatReport(state.summary, state.sections, state.actions);
}
