import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<FastifyReply>();
    const request = context.getRequest<FastifyRequest>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const details =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? exceptionResponse
        : undefined;
    const message = extractMessage(exception, exceptionResponse);

    if (statusCode >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
    void response.status(statusCode).send({
      statusCode,
      code: statusCodeToCode(statusCode),
      message,
      ...(details === undefined ? {} : { details }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

function extractMessage(exception: unknown, response: unknown): string {
  if (typeof response === 'string') return response;
  if (
    typeof response === 'object' &&
    response !== null &&
    'message' in response
  ) {
    const message = response.message;
    return Array.isArray(message) ? message.join('; ') : String(message);
  }
  return exception instanceof Error
    ? exception.message
    : 'Internal server error';
}

function statusCodeToCode(statusCode: number): string {
  return HttpStatus[statusCode] ?? 'HTTP_ERROR';
}
