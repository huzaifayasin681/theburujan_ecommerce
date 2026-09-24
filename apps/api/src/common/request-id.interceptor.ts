import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { catchError, type Observable, tap, throwError } from 'rxjs';
import { StructuredLogger } from './structured-logger.service';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  constructor(private readonly logger: StructuredLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { requestId?: string }>();
    const response = context.switchToHttp().getResponse<Response>();
    const incoming = request.header('x-request-id');
    request.requestId = incoming?.slice(0, 128) ?? randomUUID();
    response.setHeader('x-request-id', request.requestId);
    const startedAt = Date.now();
    const fields = { requestId: request.requestId, method: request.method, path: request.originalUrl };
    return next.handle().pipe(
      tap(() => this.logger.event('info', 'http_request_completed', { ...fields, statusCode: response.statusCode, durationMs: Date.now() - startedAt })),
      catchError((error: unknown) => {
        const statusCode = error instanceof HttpException ? error.getStatus() : 500;
        this.logger.event(statusCode >= 500 ? 'error' : 'warn', 'http_request_failed', { ...fields, statusCode, durationMs: Date.now() - startedAt });
        return throwError(() => error);
      }),
    );
  }
}
