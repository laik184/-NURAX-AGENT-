export const JSON_FENCE_REGEX = /```(?:json)?\s*([\s\S]*?)```/gi;
export const CODE_BLOCK_REGEX = /```([a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)```/g;
export const INLINE_BACKTICK_REGEX = /`([^`]+)`/g;
export const MARKDOWN_DECORATOR_REGEX = /(^|\n)\s{0,3}(#{1,6}|>|[-*+]\s|\d+\.\s)/g;
