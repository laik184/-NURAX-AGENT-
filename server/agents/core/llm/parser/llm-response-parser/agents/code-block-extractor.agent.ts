import { extractCodeBlocks, type ExtractedCodeBlock } from "../utils/code-block.util";

export interface CodeExtractionResult {
  blocks: ExtractedCodeBlock[];
  primary: ExtractedCodeBlock | null;
}

export const extractCodeFromResponse = (input: string): CodeExtractionResult => {
  const blocks = extractCodeBlocks(input);
  return {
    blocks,
    primary: blocks.length > 0 ? blocks[0] : null,
  };
};
