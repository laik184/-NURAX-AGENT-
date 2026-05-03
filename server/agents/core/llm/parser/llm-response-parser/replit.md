# LLM Response Parser (HVP)

## 1) Parsing flow

The parser follows a strict orchestration pipeline:

`orchestrator -> markdown-cleaner -> error-detector -> json/code extractors -> fallback-parser -> structure-normalizer`

Execution details:
1. Receive raw LLM output.
2. Clean markdown artifacts from text.
3. Detect empty/disclaimer-pattern errors.
4. Attempt JSON extraction and safe parsing.
5. Attempt fenced code extraction when JSON is unavailable.
6. Apply fallback parsing for partially structured or plain text output.
7. Normalize into a frozen, consistent output schema.

## 2) Agent responsibilities

- `markdown-cleaner.agent.ts`: removes markdown symbols and normalizes whitespace.
- `error-detector.agent.ts`: detects empty output and known hallucination/disclaimer patterns.
- `json-extractor.agent.ts`: identifies JSON candidates and parses safely.
- `code-block-extractor.agent.ts`: extracts fenced code blocks and language metadata.
- `fallback-parser.agent.ts`: recovers partial JSON or converts text to structured line output.
- `structure-normalizer.agent.ts`: enforces final output schema and immutability.

## 3) Import relationships

HVP import boundaries are preserved:
- L1 (`orchestrator.ts`) imports only from L2 agents + L0 state/types + L3 logger utility.
- L2 agents import only L3 utilities and L0 types.
- L3 utilities are helper-only and contain no parser domain orchestration.
- No agent-to-agent imports.

## 4) Error handling strategy

- JSON parse failures are captured as structured `ErrorInfo` entries.
- Empty or disclaimer-like responses are flagged by the error detector.
- Parsing continues even when errors are present, enabling best-effort outputs.
- Final `success` is `false` whenever error list is non-empty.

## 5) Fallback logic

Fallback parser behavior:
1. Try partial JSON recovery using the broadest `{ ... }` segment.
2. If recovery succeeds, return `type: "json"` with a recovery error marker.
3. Otherwise return `type: "text"` with normalized text and line array.

This ensures downstream agents always receive structured and predictable data.
