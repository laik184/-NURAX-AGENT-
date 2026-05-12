/**
 * IQ 2000 — Console · Filter Service
 *
 * Classifies raw stdout/stderr chunks into typed ConsoleLine objects.
 * Rules are configurable at runtime via addRule() / removeRule().
 */

import { randomUUID } from 'crypto';
import type { FilterResult, FilterRule, LineKind, RawLine, ConsoleLine } from '../types.ts';
import { DEFAULT_RULES, classifyLine, chunkToLines, normalizeLine } from './filter.utils.ts';

class FilterService {
  private rules: FilterRule[] = [...DEFAULT_RULES];

  // ─── Rule management ───────────────────────────────────────────────────

  addRule(rule: FilterRule): void {
    this.rules.push(rule);
  }

  removeRule(pattern: RegExp): void {
    this.rules = this.rules.filter((r) => r.pattern.source !== pattern.source);
  }

  getRules(): readonly FilterRule[] {
    return this.rules;
  }

  resetRules(): void {
    this.rules = [...DEFAULT_RULES];
  }

  // ─── Classification ────────────────────────────────────────────────────

  /**
   * Classify a single pre-split line.
   * `defaultKind` is used when no rule matches (normally 'stdout' or 'stderr').
   */
  classifyLine(text: string, defaultKind: LineKind = 'stdout'): FilterResult {
    const normalized = normalizeLine(text);
    const kind = classifyLine(normalized, this.rules, defaultKind);
    return { kind, text: normalized, matched: kind !== defaultKind };
  }

  /**
   * Process a raw output line (from capture service) and return a
   * fully typed ConsoleLine ready for persist + stream.
   */
  processRaw(raw: RawLine): ConsoleLine {
    const defaultKind: LineKind = raw.stream === 'stderr' ? 'stderr' : 'stdout';
    const { kind, text } = this.classifyLine(raw.text, defaultKind);

    return {
      id: randomUUID(),
      projectId: raw.projectId,
      kind,
      text,
      ts: new Date(),
    };
  }

  /**
   * Split a raw chunk into individual lines, classify each, and return
   * an array of typed ConsoleLine objects.
   */
  processChunk(projectId: number, chunk: Buffer | string, stream: 'stdout' | 'stderr'): ConsoleLine[] {
    return chunkToLines(chunk).map((text) =>
      this.processRaw({ projectId, stream, text }),
    );
  }
}

export const filterService = new FilterService();
