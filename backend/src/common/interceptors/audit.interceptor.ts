import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../infrastructure/audit/audit.service';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * Blanket safety net so every mutating admin request lands in the audit log even
 * where a controller doesn't (yet) make its own richer, action-specific AuditService.log() call.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    if (!MUTATING_METHODS.has(request.method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        this.auditService.log({
          actorId: request.user?.id,
          actorType: 'ADMIN_USER',
          action: `${request.method} ${request.route?.path ?? request.path}`,
          entityType: context.getClass().name.replace('Controller', ''),
          metadata: { params: request.params, query: request.query },
        });
      }),
    );
  }
}
