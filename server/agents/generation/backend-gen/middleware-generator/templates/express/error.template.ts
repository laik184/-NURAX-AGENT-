const template = `
export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[middleware:error]', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error' });
}
`;

export default template;
