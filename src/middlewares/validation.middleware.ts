import { ZodError, type ZodTypeAny } from 'zod';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError } from '../utils/ApiError';

interface SchemaSet {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

function toApiError(err: unknown): unknown {
  if (err instanceof ZodError) {
    return ApiError.unprocessable(
      'Validation failed',
      err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
    );
  }
  return err;
}

export const validate =
  (schemas: SchemaSet): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as typeof req.query;
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body ?? {});
      }
      next();
    } catch (err) {
      next(toApiError(err));
    }
  };
