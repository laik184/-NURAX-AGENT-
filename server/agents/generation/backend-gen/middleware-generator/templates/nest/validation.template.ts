const template = `
@Injectable()
export class ValidationMiddleware implements NestMiddleware {
  use(req: Request & { body?: unknown }, _res: Response, next: NextFunction): void {
    if (!req.body || typeof req.body !== 'object') {
      throw new BadRequestException('Invalid request payload');
    }

    next();
  }
}
`;

export default template;
