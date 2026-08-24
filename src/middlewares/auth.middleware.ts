import { User } from '../models/User';
import { verifyAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
  if (!token) throw ApiError.unauthorized('Authentication token is missing');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const exists = await User.exists({ _id: payload.id });
  if (!exists) throw ApiError.unauthorized('User no longer exists');

  req.user = { id: payload.id, email: payload.email };
  next();
});
