const template = `
const requestMap = new Map<string, { count: number; windowStart: number }>();

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip;
  const now = Date.now();
  const current = requestMap.get(key) ?? { count: 0, windowStart: now };

  if (now - current.windowStart > 60_000) {
    current.count = 0;
    current.windowStart = now;
  }

  current.count += 1;
  requestMap.set(key, current);

  if (current.count > 100) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  next();
}
`;

export default template;
