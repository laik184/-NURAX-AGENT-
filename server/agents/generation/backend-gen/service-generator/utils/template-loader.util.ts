import type { SupportedFramework } from '../types.js';

const frameworkHeaders: Record<SupportedFramework, string[]> = {
  express: [
    "import type { Logger } from 'node:console';",
    "import type { Request } from 'express';",
  ],
  nest: [
    "import { Injectable } from '@nestjs/common';",
    "import type { Logger } from 'node:console';",
  ],
  fastapi: [
    '// FastAPI target: generated in TypeScript for gateway-side orchestration.',
    "import type { Logger } from 'node:console';",
  ],
};

export const templateLoaderUtil = {
  loadHeader(framework: SupportedFramework): string[] {
    return [...frameworkHeaders[framework]];
  },
};
