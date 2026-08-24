import mongoose from 'mongoose';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

interface MongooseDuplicateError {
  code?: number;
  keyValue?: Record<string, unknown>;
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
}

export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 422;
    message = 'Validation Failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for '${err.path}'`;
  } else if (err instanceof TokenExpiredError) {
    statusCode = 401;
    message = 'Token expired';
  } else if (err instanceof JsonWebTokenError) {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON body';
  } else {
    const duplicate = err as MongooseDuplicateError;
    if (duplicate?.code === 11000) {
      statusCode = 409;
      message = `Duplicate value for: ${Object.keys(duplicate.keyValue ?? {}).join(', ') || 'unique field'}`;
      details = duplicate.keyValue;
    }
  }

  if (statusCode >= 500) {
    const stack = err instanceof Error ? err.stack : String(err);
    logger.error(`Unhandled error: ${stack ?? message}`);
  }

  const body: Record<string, unknown> = { success: false, message };
  if (details !== undefined && details !== null) body.details = details;
  if (statusCode >= 500 && process.env.NODE_ENV !== 'production') body.stack = err instanceof Error ? err.stack : undefined;

  res.status(statusCode).json(body);
}
