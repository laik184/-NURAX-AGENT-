const template = `
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('LoggerMiddleware');

  use(req: Request, _res: Response, next: NextFunction): void {
    this.logger.log(req.method + ' ' + req.url);
    next();
  }
}
`;

export default template;
