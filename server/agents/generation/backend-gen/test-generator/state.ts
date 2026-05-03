import type { BackendModule, GeneratedTestFile } from "./types";

export type GeneratorStatus = "IDLE" | "GENERATING" | "SUCCESS" | "FAILED";

export interface GeneratorState {
  modules: BackendModule[];
  generatedTests: GeneratedTestFile[];
  coverageEstimate: number;
  status: GeneratorStatus;
  logs: string[];
  errors: string[];
}

const cloneState = (state: GeneratorState): GeneratorState => ({
  modules: [...state.modules],
  generatedTests: [...state.generatedTests],
  coverageEstimate: state.coverageEstimate,
  status: state.status,
  logs: [...state.logs],
  errors: [...state.errors],
});

export const createInitialState = (): GeneratorState => ({
  modules: [],
  generatedTests: [],
  coverageEstimate: 0,
  status: "IDLE",
  logs: [],
  errors: [],
});

export class GeneratorStateStore {
  private state: GeneratorState = createInitialState();

  start(modules: BackendModule[]): void {
    this.state = {
      ...createInitialState(),
      modules: [...modules],
      status: "GENERATING",
      logs: ["Generation started"],
    };
  }

  appendLog(message: string): void {
    this.state = {
      ...this.state,
      logs: [...this.state.logs, message],
    };
  }

  appendError(message: string): void {
    this.state = {
      ...this.state,
      status: "FAILED",
      errors: [...this.state.errors, message],
      logs: [...this.state.logs, `ERROR: ${message}`],
    };
  }

  setGeneratedTests(files: GeneratedTestFile[]): void {
    this.state = {
      ...this.state,
      generatedTests: [...files],
    };
  }

  setCoverageEstimate(coverageEstimate: number): void {
    this.state = {
      ...this.state,
      coverageEstimate,
    };
  }

  markSuccess(): void {
    this.state = {
      ...this.state,
      status: "SUCCESS",
      logs: [...this.state.logs, "Generation completed successfully"],
    };
  }

  snapshot(): GeneratorState {
    return cloneState(this.state);
  }
}
