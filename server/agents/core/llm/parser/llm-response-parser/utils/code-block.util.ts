import { CODE_BLOCK_REGEX } from "./regex.util";

export interface ExtractedCodeBlock {
  language: string;
  code: string;
}

export const extractCodeBlocks = (value: string): ExtractedCodeBlock[] => {
  const blocks: ExtractedCodeBlock[] = [];
  for (const match of value.matchAll(CODE_BLOCK_REGEX)) {
    blocks.push({
      language: (match[1] || "plaintext").toLowerCase(),
      code: match[2]?.trim() || "",
    });
  }
  return blocks;
};
