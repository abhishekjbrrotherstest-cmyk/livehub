import type { ApiEnvelope } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? `${window.location.origin}/api/v1`;
const TOKEN_KEY = 'livehub_token';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}

export { toErrorMessage };

export async function api<T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch {
    throw new ApiError('Cannot reach server. Is the backend running?', 0);
  }

  const json = (await response.json().catch(() => null)) as Partial<ApiEnvelope<T>> | null;

  if (!response.ok || !json?.success) {
    throw new ApiError(json?.message ?? `Request failed (${response.status})`, response.status);
  }

  return json as ApiEnvelope<T>;
}
