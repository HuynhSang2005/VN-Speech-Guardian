/**
 * Mục đích: log structured JSON cho mọi request/response
 * Input:  HTTP request/response
 * Output: JSON log với reqId, method, url, statusCode, duration
 * Edge:   error → log stack trace
 * Research: https://docs.nestjs.com/interceptors#response-mapping
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    // tạo unique request ID
    const reqId = uuidv4();
    const startTime = Date.now();
    
    // attach reqId vào request cho các service khác dùng
    (request as any).reqId = reqId;

    // log request info
    this.logger.log({
      reqId,
      method: request.method,
      url: request.url,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
  userId: (request as any).user?.id || (request as any).user?.clerkId,
    });

    return next.handle().pipe(
      tap(() => {
        // log successful response
        const duration = Date.now() - startTime;
        this.logger.log({
          reqId,
          statusCode: response.statusCode,
          duration: `${duration}ms`,
        });
      }),
      catchError((error) => {
        // log error response
        const duration = Date.now() - startTime;
        this.logger.error({
          reqId,
          statusCode: error.status || 500,
          duration: `${duration}ms`,
          error: error.message,
          stack: error.stack,
        });
        throw error;
      }),
    );
  }
}