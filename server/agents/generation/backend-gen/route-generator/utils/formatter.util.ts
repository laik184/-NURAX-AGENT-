import type { GeneratedRoute } from "../types";

export const formatExpressRoutesFile = (routes: GeneratedRoute[]): string => {
  const routeLines = routes.map((route) => `  ${route.frameworkCode}`).join("\n");

  return [
    "import { Router } from 'express';",
    "",
    "const router = Router();",
    "",
    routeLines,
    "",
    "export default router;",
    "",
  ].join("\n");
};

export const formatNestControllerFile = (routes: GeneratedRoute[]): string => {
  const methods = routes.map((route) => `  ${route.frameworkCode}`).join("\n\n");

  return [
    "import { Controller, Delete, Get, Patch, Post, Put } from '@nestjs/common';",
    "",
    "@Controller()",
    "export class GeneratedRoutesController {",
    methods,
    "}",
    "",
  ].join("\n");
};
