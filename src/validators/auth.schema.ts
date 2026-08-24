import { z } from 'zod';

export const registerSchema = {
  body: z
    .object({
      name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50),
      email: z.string().trim().toLowerCase().email('Invalid email format').max(255),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(72)
        .regex(/[A-Za-z]/, 'Password must contain at least one letter')
        .regex(/\d/, 'Password must contain at least one number'),
      profileImage: z.string().url('profileImage must be a valid URL').optional().nullable()
    })
    .strict()
};

export const loginSchema = {
  body: z
    .object({
      email: z.string().trim().toLowerCase().email('Invalid email format'),
      password: z.string().min(1, 'Password is required')
    })
    .strict()
};

export type RegisterBody = z.infer<typeof registerSchema.body>;
export type LoginBody = z.infer<typeof loginSchema.body>;
