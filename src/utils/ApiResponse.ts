import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SendSuccessOptions {
  status?: number;
  message?: string;
  data?: unknown;
  meta?: PaginationMeta;
}

export function sendSuccess(res: Response, options: SendSuccessOptions = {}): void {
  const { status = 200, message = 'Success', data = null, meta } = options;
  const body = meta
    ? { success: true, message, data, meta }
    : { success: true, message, data };
  res.status(status).json(body);
}
