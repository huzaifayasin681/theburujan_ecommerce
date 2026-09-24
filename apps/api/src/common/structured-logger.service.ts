import { Injectable, type LoggerService } from '@nestjs/common';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

@Injectable()
export class StructuredLogger implements LoggerService {
  log(message: unknown, context?: string): void {
    this.write('info', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  event(level: LogLevel, message: string, fields: Record<string, unknown> = {}): void {
    this.emit(level, { message, ...fields });
  }

  private write(level: LogLevel, message: unknown, context?: string, trace?: string): void {
    this.emit(level, {
      message: typeof message === 'string' ? message : 'application_event',
      ...(typeof message === 'object' && message !== null ? { data: message } : {}),
      ...(context ? { context } : {}),
      ...(trace && process.env.NODE_ENV !== 'production' ? { trace } : {}),
    });
  }

  private emit(level: LogLevel, fields: Record<string, unknown>): void {
    const serialized = JSON.stringify({ timestamp: new Date().toISOString(), level, ...fields });
    (level === 'error' ? process.stderr : process.stdout).write(`${serialized}\n`);
  }
}
