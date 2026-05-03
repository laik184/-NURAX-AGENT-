import expressAuthTemplate from "../templates/express/auth.template.js";
import expressErrorTemplate from "../templates/express/error.template.js";
import expressLoggerTemplate from "../templates/express/logger.template.js";
import expressRateLimitTemplate from "../templates/express/rate-limit.template.js";
import expressValidationTemplate from "../templates/express/validation.template.js";
import nestAuthTemplate from "../templates/nest/auth.template.js";
import nestErrorTemplate from "../templates/nest/error.template.js";
import nestLoggerTemplate from "../templates/nest/logger.template.js";
import nestRateLimitTemplate from "../templates/nest/rate-limit.template.js";
import nestValidationTemplate from "../templates/nest/validation.template.js";
import type { FrameworkType, MiddlewareType } from "../types.js";

const templateRegistry: Readonly<Record<FrameworkType, Readonly<Record<MiddlewareType, string>>>> = {
  express: {
    auth: expressAuthTemplate,
    logging: expressLoggerTemplate,
    validation: expressValidationTemplate,
    error: expressErrorTemplate,
    "rate-limit": expressRateLimitTemplate,
  },
  nest: {
    auth: nestAuthTemplate,
    logging: nestLoggerTemplate,
    validation: nestValidationTemplate,
    error: nestErrorTemplate,
    "rate-limit": nestRateLimitTemplate,
  },
};

export function loadTemplate(framework: FrameworkType, middlewareType: MiddlewareType): string {
  return templateRegistry[framework][middlewareType];
}
