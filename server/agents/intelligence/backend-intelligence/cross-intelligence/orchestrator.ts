import { CorrelationEngineAgent } from "./agents/correlation.engine.agent";
import { InsightSynthesizerAgent } from "./agents/insight.synthesizer.agent";
import { MultiSignalAnalyzerAgent } from "./agents/multi-signal.analyzer.agent";
import { CrossIntelligenceInput, CrossIntelligenceOutput } from "./types";

export class CrossIntelligenceOrchestrator {
  private correlationEngine = new CorrelationEngineAgent();
  private insightSynthesizer = new InsightSynthesizerAgent();
  private multiSignalAnalyzer = new MultiSignalAnalyzerAgent();

  run(input: CrossIntelligenceInput): CrossIntelligenceOutput {
    const correlations = this.correlationEngine.correlate(input);
    const insights = this.insightSynthesizer.synthesize(correlations);
    const report = this.multiSignalAnalyzer.analyze(input);

    return { insights, report };
  }
}
