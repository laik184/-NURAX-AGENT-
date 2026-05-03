import { MemoryInput, MemoryQuery, MemoryResult } from "./types";
import { scoreMemory } from "./agents/memory-scorer.agent";
import { filterMemory } from "./agents/memory-filter.agent";
import { classifyMemory } from "./agents/memory-classifier.agent";
import { checkDuplicate, countSimilar } from "./agents/memory-deduplicator.agent";
import { writeMemory } from "./agents/memory-writer.agent";
import { retrieveMemory } from "./agents/memory-retriever.agent";
import { cleanMemory } from "./agents/memory-cleaner.agent";
import { learnFromHistory } from "./agents/memory-learning.agent";
import { getAllItems } from "./state";
import { PATTERN_SIMILARITY_THRESHOLD } from "./utils/similarity.util";

const CLEAN_CYCLE_INTERVAL = 50;
let operationCount = 0;

export async function processMemory(input: MemoryInput): Promise<MemoryResult> {
  const logs: string[] = [];

  try {
    logs.push(`[orchestrator] Processing memory input id=${input.id}`);

    const allItems = getAllItems();

    const dedup = checkDuplicate(input, allItems);
    logs.push(`[orchestrator] Deduplication: isDuplicate=${dedup.isDuplicate}, similarity=${dedup.similarity}`);

    const similarCount = countSimilar(input, allItems, PATTERN_SIMILARITY_THRESHOLD);
    const isRepeatPattern = similarCount >= 2;
    logs.push(`[orchestrator] Similar items found: ${similarCount}, isRepeatPattern=${isRepeatPattern}`);

    const score = scoreMemory(input, similarCount, countSimilar(input, allItems, 0.3));
    logs.push(`[orchestrator] Score computed: total=${score.total}`);

    const decision = filterMemory(input, score, isRepeatPattern, dedup.isDuplicate);
    logs.push(`[orchestrator] Filter decision: ${decision.kind} — ${decision.reason}`);

    if (decision.kind === "IGNORE") {
      return Object.freeze({
        success: true,
        stored: false,
        score: score.total,
        logs: Object.freeze(logs),
      });
    }

    const classification = classifyMemory(input, score, isRepeatPattern);
    logs.push(`[orchestrator] Classified as: ${classification.type} — ${classification.reason}`);

    const patternKey = classification.type === "pattern"
      ? input.content.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).slice(0, 6).join("-")
      : undefined;

    const item = writeMemory(input, classification.type, score.total, patternKey);
    logs.push(`[orchestrator] Memory written: id=${item.id}, type=${item.type}`);

    operationCount++;
    if (operationCount % CLEAN_CYCLE_INTERVAL === 0) {
      const cleanResult = cleanMemory();
      logs.push(...cleanResult.logs);
    }

    return Object.freeze({
      success: true,
      stored: true,
      type: classification.type,
      score: score.total,
      logs: Object.freeze(logs),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logs.push(`[orchestrator] Error: ${error}`);
    return Object.freeze({
      success: false,
      stored: false,
      score: 0,
      logs: Object.freeze(logs),
      error,
    });
  }
}

export async function queryMemory(query: MemoryQuery): Promise<MemoryResult> {
  const logs: string[] = [];

  try {
    logs.push(`[orchestrator] Querying memory: context="${query.context ?? ""}", type=${query.type ?? "all"}`);

    const results = retrieveMemory(query);
    logs.push(`[orchestrator] Retrieved ${results.length} items`);

    return Object.freeze({
      success: true,
      stored: false,
      score: 0,
      retrieved: results,
      logs: Object.freeze(logs),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logs.push(`[orchestrator] Query error: ${error}`);
    return Object.freeze({
      success: false,
      stored: false,
      score: 0,
      logs: Object.freeze(logs),
      error,
    });
  }
}

export async function runCleanCycle(): Promise<MemoryResult> {
  const logs: string[] = [];

  try {
    logs.push("[orchestrator] Running manual clean cycle");
    const result = cleanMemory();
    logs.push(...result.logs);
    return Object.freeze({
      success: true,
      stored: false,
      score: 0,
      logs: Object.freeze(logs),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return Object.freeze({
      success: false,
      stored: false,
      score: 0,
      logs: Object.freeze([`[orchestrator] Clean error: ${error}`]),
      error,
    });
  }
}

export async function runLearningCycle(): Promise<MemoryResult> {
  const logs: string[] = [];

  try {
    logs.push("[orchestrator] Running learning cycle");
    const result = learnFromHistory();
    logs.push(...result.logs);
    return Object.freeze({
      success: true,
      stored: false,
      score: 0,
      logs: Object.freeze(logs),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return Object.freeze({
      success: false,
      stored: false,
      score: 0,
      logs: Object.freeze([`[orchestrator] Learning error: ${error}`]),
      error,
    });
  }
}
