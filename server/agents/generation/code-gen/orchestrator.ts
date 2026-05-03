import { CodeWriterAgent } from "./agents/code-writer.agent.js";
import { OutputValidatorAgent } from "./agents/output-validator.agent.js";
import { PromptBuilderAgent } from "./agents/prompt-builder.agent.js";
import { StructurePlannerAgent } from "./agents/structure-planner.agent.js";
import { TemplateSelectorAgent } from "./agents/template-selector.agent.js";
import { createInitialState, transitionState, type CodeGenState } from "./state.js";
import type { CodeRequest, GenerationResult, ValidationResult } from "./types.js";
import { dedupeFiles } from "./utils/file-map.util.js";
import { createLogger } from "./utils/logger.util.js";

export class CodeGenOrchestrator {
  private readonly planner = new StructurePlannerAgent();
  private readonly templateSelector = new TemplateSelectorAgent();
  private readonly promptBuilder = new PromptBuilderAgent();
  private readonly writer = new CodeWriterAgent();
  private readonly validator = new OutputValidatorAgent();

  async generate(request: CodeRequest): Promise<GenerationResult> {
    const logger = createLogger("code-gen.orchestrator");
    let state = createInitialState(request.requestId, request.intent);

    state = this.updateState(state, {
      status: "GENERATING",
      logs: [...state.logs, logger.info(`Generation started for intent: ${request.intent}`)],
    });

    const structure = this.planner.plan(request);
    const template = this.templateSelector.select(request);
    const prompt = this.promptBuilder.build(request, structure, template);

    const generated = await this.writer.write(prompt, structure.files);
    const files = dedupeFiles(generated);

    const validation = this.validator.validate(files, structure);
    if (!validation.valid) {
      state = this.updateState(state, {
        status: "FAILED",
        errors: [...state.errors, validation.error ?? "Validation failed"],
        logs: [...state.logs, ...validation.logs],
      });

      return Object.freeze({
        success: false,
        files: Object.freeze([]),
        logs: state.logs,
        error: state.errors[0] ?? "Code generation failed",
      });
    }

    state = this.updateState(state, {
      status: "SUCCESS",
      filesGenerated: files.map((file) => file.path),
      logs: [...state.logs, ...validation.logs, logger.info("Generation completed successfully.")],
    });

    return Object.freeze({
      success: true,
      files: files,
      logs: state.logs,
    });
  }

  validateOutput(result: GenerationResult): ValidationResult {
    const structure = Object.freeze({
      files: result.files.map((file) => file.path),
      rationale: Object.freeze(["Validation against generated output."]),
    });

    return this.validator.validate(result.files, structure);
  }

  buildStructure(request: CodeRequest): readonly string[] {
    return this.planner.plan(request).files;
  }

  private updateState(
    current: CodeGenState,
    patch: Partial<Omit<CodeGenState, "requestId" | "intent">>,
  ): CodeGenState {
    return transitionState(current, patch);
  }
}
