import * as authService from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import type { LoginBody, RegisterBody } from '../validators/auth.schema';

export const register = asyncHandler(async (req, res) => {
  const body = req.body as RegisterBody;
  const result = await authService.registerUser(body);
  sendSuccess(res, { status: 201, message: 'User registered successfully', data: result });
});

export const login = asyncHandler(async (req, res) => {
  const body = req.body as LoginBody;
  const result = await authService.loginUser(body);
  sendSuccess(res, { message: 'Logged in successfully', data: result });
});
