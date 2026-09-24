import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { StructuredLogger } from './structured-logger.service';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly production: boolean, private readonly logger: StructuredLogger) {}
  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request & { requestId?: string }>();
    const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = error instanceof HttpException ? error.getResponse() : undefined;
    const objectPayload = typeof payload === 'object' && payload !== null ? payload : {};
    const message = typeof payload === 'string' ? payload : (objectPayload as { message?: unknown }).message;
    if (status >= 500) {
      this.logger.event('error', 'unhandled_http_exception', {
        requestId: request.requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode: status,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }
    response.status(status).json({
      statusCode: status,
      code: (objectPayload as { code?: string }).code ?? HttpStatus[status] ?? 'INTERNAL_ERROR',
      message: Array.isArray(message) ? message.join('; ') : String(message ?? 'An unexpected error occurred'),
      details: (objectPayload as { details?: unknown }).details ?? undefined,
      requestId: request.requestId,
      ...(this.production ? {} : { path: request.url }),
    });
  }
}
