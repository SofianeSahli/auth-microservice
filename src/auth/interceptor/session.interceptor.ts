import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import * as useragent from 'express-useragent';
import { SessionService } from '../services/session.service';

@Injectable()
export class SessionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SessionInterceptor.name);

  constructor(private readonly sessionService: SessionService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest<any>();
    const user = req.user ?? null;
    if (!user || !user.id) return next.handle();

    try {
      const ua = useragent.parse(req.headers['user-agent'] || '');
      const device = `${ua.browser || 'unknown'} on ${ua.platform || 'unknown'}`;
      const ip = req.ip || req.connection.remoteAddress || '';

      const session = await this.sessionService.createSession(
        user.id,
        device,
        ip,
        req.headers['user-agent'] || '',
      );
      req.session_id = session.id;
    } catch (err) {
      this.logger.error(`Failed to establish session for ${user?.id}: ${err.message}`);
    }

    return next.handle();
  }
}