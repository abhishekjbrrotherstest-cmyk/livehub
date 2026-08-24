import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?.id);
  if (!user) throw ApiError.notFound('User not found');
  sendSuccess(res, { message: 'Current user fetched', data: user.toJSON() });
});
