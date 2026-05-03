import { TaskInput, PriorityResult } from "./types";
import { detectAllUrgency } from "./agents/urgency-detector.agent";
import { analyzeAllImpacts } from "./agents/impact-analyzer.agent";
import { computeAllDependencyWeights } from "./agents/dependency-weight.agent";
import { calculateAllPriorities } from "./agents/priority-calculator.agent";
import { resolveConflicts } from "./agents/conflict-resolver.agent";
import { sortByPriority } from "./utils/sort.util";
import { setTasks, setEvaluated } from "./state";

export function prioritize(tasks: readonly TaskInput[]): PriorityResult {
  const logs: string[] = [];

  try {
    if (tasks.length === 0) {
      return Object.freeze({
        success: true,
        priorities: Object.freeze([]),
        logs: Object.freeze(["[priority] No tasks provided — returning empty result."]),
      });
    }

    logs.push(`[priority] Starting evaluation of ${tasks.length} task(s).`);
    setTasks(tasks);

    const now = Date.now();

    const urgencies = detectAllUrgency(tasks, now);
    logs.push(`[priority] Urgency detected for ${urgencies.length} task(s).`);

    const impacts = analyzeAllImpacts(tasks);
    logs.push(`[priority] Impact analyzed for ${impacts.length} task(s).`);

    const dependencies = computeAllDependencyWeights(tasks);
    const blockedCount = dependencies.filter((d) => d.isBlocked).length;
    logs.push(`[priority] Dependency weights computed — ${blockedCount} blocked task(s).`);

    const rawPriorities = calculateAllPriorities(tasks, urgencies, impacts, dependencies);
    logs.push(`[priority] Priorities calculated — score range: ${Math.min(...rawPriorities.map((p) => p.score))}–${Math.max(...rawPriorities.map((p) => p.score))}.`);

    const resolved = resolveConflicts(rawPriorities, tasks);
    const tieBreaksApplied = resolved.filter((r, i) => r.score !== rawPriorities[i].score).length;
    if (tieBreaksApplied > 0) {
      logs.push(`[priority] Conflict resolution applied tie-breaks to ${tieBreaksApplied} task(s).`);
    }

    const sorted = sortByPriority(resolved);
    logs.push(`[priority] Sorted. Top task: "${sorted[0]?.taskId}" at score ${sorted[0]?.score} (${sorted[0]?.level}).`);

    setEvaluated(sorted);

    logs.push(`[priority] Evaluation complete.`);

    return Object.freeze({
      success: true,
      priorities: Object.freeze(sorted),
      logs: Object.freeze(logs),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logs.push(`[priority] Error: ${error}`);
    return Object.freeze({
      success: false,
      priorities: Object.freeze([]),
      logs: Object.freeze(logs),
      error,
    });
  }
}
