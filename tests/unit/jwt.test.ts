import { describe, expect, it } from 'vitest';
import { signAccessToken, verifyAccessToken } from '../../src/utils/jwt';
import { ApiError } from '../../src/utils/ApiError';

describe('jwt utils', () => {
  const payload = { id: '64b64b64b64b64b64b64b64b', email: 'user@example.com' };

  it('signs and verifies a token roundtrip', () => {
    const token = signAccessToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);
    expect(verifyAccessToken(token)).toMatchObject(payload);
  });

  it('rejects malformed tokens', () => {
    expect(() => verifyAccessToken('not-a-real-token')).toThrow();
  });
});

describe('ApiError', () => {
  it('defaults to 500 for plain construction', () => {
    const err = new ApiError(500, 'boom');
    expect(err.statusCode).toBe(500);
    expect(err.name).toBe('ApiError');
  });

  it('exposes static helpers with correct status codes', () => {
    expect(ApiError.badRequest().statusCode).toBe(400);
    expect(ApiError.unauthorized().statusCode).toBe(401);
    expect(ApiError.forbidden().statusCode).toBe(403);
    expect(ApiError.notFound().statusCode).toBe(404);
    expect(ApiError.conflict().statusCode).toBe(409);
    expect(ApiError.unprocessable('Validation failed', []).statusCode).toBe(422);
    expect(ApiError.internal().statusCode).toBe(500);
  });

  it('carries details', () => {
    const err = ApiError.badRequest('bad input', [{ field: 'name' }]);
    expect(err.details).toEqual([{ field: 'name' }]);
  });
});
