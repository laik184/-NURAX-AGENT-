const template = `
const requestMap = new Map<string, { count: number; windowStart: number }>();

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  use(req: Request & { ip: string }, _res: Response, next: NextFunction): void {
    const now = Date.now();
    const current = requestMap.get(req.ip) ?? { count: 0, windowStart: now };

    if (now - current.windowStart > 60_000) {
      current.count = 0;
      current.windowStart = now;
    }

    current.count += 1;
    requestMap.set(req.ip, current);

    if (current.count > 100) {
      throw new TooManyRequestsException('Too many requests');
    }

    next();
  }
}
`;

export default template;
