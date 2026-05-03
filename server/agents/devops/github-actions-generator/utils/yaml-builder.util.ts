import type { JobConfig, StepConfig, TriggerConfig } from "../types.js";

function indent(level: number): string {
  return "  ".repeat(level);
}

function yamlString(value: string): string {
  const needsQuotes = /[:#\[\]{},|>&*!'"?%@`]/.test(value) || value.includes("\n");
  if (needsQuotes) return `"${value.replace(/"/g, '\\"')}"`;
  return value;
}

function serializeEnvBlock(env: Readonly<Record<string, string>>, level: number): string {
  return Object.entries(env)
    .map(([k, v]) => `${indent(level)}${k}: ${yamlString(v)}`)
    .join("\n");
}

export function serializeTriggers(triggers: readonly TriggerConfig[]): string {
  if (triggers.length === 0) return `${indent(0)}on:\n${indent(1)}workflow_dispatch:`;

  const lines: string[] = [`on:`];

  for (const trigger of triggers) {
    for (const event of trigger.events) {
      if (event === "schedule" && trigger.cron) {
        lines.push(`${indent(1)}schedule:`);
        lines.push(`${indent(2)}- cron: ${yamlString(trigger.cron)}`);
        continue;
      }

      if (event === "workflow_dispatch") {
        lines.push(`${indent(1)}workflow_dispatch:`);
        continue;
      }

      lines.push(`${indent(1)}${event}:`);

      if (trigger.branches && trigger.branches.length > 0) {
        lines.push(`${indent(2)}branches:`);
        for (const branch of trigger.branches) {
          lines.push(`${indent(3)}- ${yamlString(branch)}`);
        }
      }

      if (trigger.paths && trigger.paths.length > 0) {
        lines.push(`${indent(2)}paths:`);
        for (const path of trigger.paths) {
          lines.push(`${indent(3)}- ${yamlString(path)}`);
        }
      }
    }
  }

  return lines.join("\n");
}

export function serializeStep(step: StepConfig, level: number): string {
  const lines: string[] = [];
  const base = indent(level);
  const sub = indent(level + 1);

  lines.push(`${base}- name: ${yamlString(step.name)}`);
  if (step.id) lines.push(`${sub}id: ${step.id}`);
  if (step.if) lines.push(`${sub}if: ${step.if}`);
  if (step.uses) lines.push(`${sub}uses: ${step.uses}`);
  if (step.workingDirectory) lines.push(`${sub}working-directory: ${step.workingDirectory}`);

  if (step.with && Object.keys(step.with).length > 0) {
    lines.push(`${sub}with:`);
    for (const [k, v] of Object.entries(step.with)) {
      lines.push(`${indent(level + 2)}${k}: ${yamlString(v)}`);
    }
  }

  if (step.env && Object.keys(step.env).length > 0) {
    lines.push(`${sub}env:`);
    lines.push(serializeEnvBlock(step.env, level + 2));
  }

  if (step.run) {
    const runLines = step.run.split("\n");
    if (runLines.length > 1) {
      lines.push(`${sub}run: |`);
      for (const l of runLines) {
        lines.push(`${indent(level + 2)}${l}`);
      }
    } else {
      lines.push(`${sub}run: ${step.run}`);
    }
  }

  return lines.join("\n");
}

export function serializeJob(job: JobConfig): string {
  const lines: string[] = [];

  lines.push(`${indent(1)}${job.id}:`);
  lines.push(`${indent(2)}name: ${yamlString(job.name)}`);
  lines.push(`${indent(2)}runs-on: ${job.runsOn}`);

  if (job.timeoutMinutes) {
    lines.push(`${indent(2)}timeout-minutes: ${job.timeoutMinutes}`);
  }

  if (job.needs && job.needs.length > 0) {
    lines.push(`${indent(2)}needs: [${job.needs.join(", ")}]`);
  }

  if (job.if) lines.push(`${indent(2)}if: ${job.if}`);

  if (job.env && Object.keys(job.env).length > 0) {
    lines.push(`${indent(2)}env:`);
    lines.push(serializeEnvBlock(job.env, 3));
  }

  if (job.steps.length > 0) {
    lines.push(`${indent(2)}steps:`);
    for (const step of job.steps) {
      lines.push(serializeStep(step, 3));
    }
  }

  return lines.join("\n");
}

export function buildYaml(
  workflowName: string,
  triggers: readonly TriggerConfig[],
  jobs: readonly JobConfig[],
): string {
  const lines: string[] = [];

  lines.push(`name: ${yamlString(workflowName)}`);
  lines.push("");
  lines.push(serializeTriggers(triggers));
  lines.push("");
  lines.push("jobs:");

  for (const job of jobs) {
    lines.push(serializeJob(job));
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}
