import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError, ValidationError } from '@bughuntr/shared';
import { ZodError } from 'zod';
import { AdminService } from '../modules/admin/admin.service.js';

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  const response: ErrorResponse = {
    statusCode: 500,
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  };

  // Handle our custom AppError hierarchy
  if (error instanceof AppError) {
    response.statusCode = error.statusCode;
    response.error = error.code;
    response.message = error.message;
    if (error.details) {
      response.details = error.details;
    }
  }
  // Handle Zod validation errors
  else if (error instanceof ZodError) {
    const validationError = new ValidationError('Validation failed', {
      issues: error.issues as unknown as Record<string, unknown>,
    });
    response.statusCode = validationError.statusCode;
    response.error = validationError.code;
    response.message = validationError.message;
    response.details = validationError.details;
  }
  // Handle Fastify built-in errors (rate limit, validation, etc.)
  else if (error.statusCode) {
    response.statusCode = error.statusCode;
    response.error = error.code ?? 'ERROR';
    response.message = error.message;
  }

  // Log 5xx errors
  if (response.statusCode >= 500) {
    _request.log.error(error, 'Unhandled server error');
    void AdminService.recordErrorLog(error.message);
  }

  void reply.status(response.statusCode).send(response);
}
