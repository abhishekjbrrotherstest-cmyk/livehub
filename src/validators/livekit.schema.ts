import { z } from 'zod';

export const livekitTokenSchema = {
  body: z
    .object({
      roomName: z
        .string()
        .trim()
        .min(1, 'roomName is required')
        .max(64)
        .regex(/^[A-Za-z0-9_.-]+$/, 'roomName may only contain letters, numbers, _ . -'),
      userId: z.string().optional(),
      role: z.enum(['host', 'participant']).default('participant')
    })
    .strict()
};

export type LiveKitTokenBody = z.infer<typeof livekitTokenSchema.body>;
