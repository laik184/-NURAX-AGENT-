const template = `
export function loggingMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const start = Date.now();
  console.info('[request]', req.method, req.originalUrl, { startedAt: start });
  next();
}
`;

export default template;
