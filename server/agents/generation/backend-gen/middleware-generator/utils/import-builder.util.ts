import type { FrameworkType, MiddlewareType } from "../types.js";

const importRegistry: Readonly<Record<FrameworkType, Readonly<Record<MiddlewareType, readonly string[]>>>> = {
  express: {
    auth: ["import type { Request, Response, NextFunction } from 'express';"],
    logging: ["import type { Request, Response, NextFunction } from 'express';"],
    validation: ["import type { Request, Response, NextFunction } from 'express';"],
    error: ["import type { Request, Response, NextFunction } from 'express';"],
    "rate-limit": ["import type { Request, Response, NextFunction } from 'express';"],
  },
  nest: {
    auth: ["import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';"],
    logging: ["import { Injectable, Logger, NestMiddleware } from '@nestjs/common';"],
    validation: ["import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';"],
    error: ["import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';"],
    "rate-limit": ["import { Injectable, NestMiddleware, TooManyRequestsException } from '@nestjs/common';"],
  },
};

export function buildImports(framework: FrameworkType, middlewareType: MiddlewareType): readonly string[] {
  return importRegistry[framework][middlewareType];
}
