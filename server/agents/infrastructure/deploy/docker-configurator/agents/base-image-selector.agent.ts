import type { ProjectType } from '../types.js';

const baseImageByProjectType: Record<ProjectType, string> = {
  node: 'node:18-alpine',
  python: 'python:3.12-alpine',
  generic: 'alpine:3.20',
};

export const selectBaseImage = (projectType: ProjectType): string => baseImageByProjectType[projectType] ?? baseImageByProjectType.generic;
