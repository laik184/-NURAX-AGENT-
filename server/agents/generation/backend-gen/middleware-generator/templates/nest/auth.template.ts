const template = `
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request & { headers: Record<string, string> }, _res: Response, next: NextFunction): void {
    const token = req.headers.authorization;

    if (!token || !token.startsWith('Bearer ')) {
      throw new UnauthorizedException('Unauthorized');
    }

    next();
  }
}
`;

export default template;
