import { User } from '../models/User';
import { signAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import type { LoginBody, RegisterBody } from '../validators/auth.schema';

export interface AuthResult {
  user: Record<string, unknown>;
  token: string;
}

export async function registerUser(input: RegisterBody): Promise<AuthResult> {
  const existing = await User.exists({ email: input.email });
  if (existing) throw ApiError.conflict('Email is already registered');

  const user = await User.create({
    name: input.name,
    email: input.email,
    password: input.password,
    profileImage: input.profileImage ?? null
  });

  const token = signAccessToken({ id: user._id.toString(), email: user.email });
  return { user: user.toJSON() as Record<string, unknown>, token };
}

export async function loginUser(input: LoginBody): Promise<AuthResult> {
  const user = await User.findOne({ email: input.email }).select('+password');
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const passwordMatches = await user.comparePassword(input.password);
  if (!passwordMatches) throw ApiError.unauthorized('Invalid email or password');

  const token = signAccessToken({ id: user._id.toString(), email: user.email });
  return { user: user.toJSON() as Record<string, unknown>, token };
}
