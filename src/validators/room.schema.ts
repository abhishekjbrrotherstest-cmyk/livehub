import { z } from 'zod';

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier');

export const createRoomSchema = {
  body: z
    .object({
      name: z.string().trim().min(3, 'Room name must be at least 3 characters').max(80)
    })
    .strict()
};

export const roomIdParamSchema = {
  params: z.object({ id: objectIdSchema })
};

export const listRoomsQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['active', 'ended']).optional(),
    search: z.string().trim().max(80).optional()
  })
};

export const listMessagesSchema = {
  params: z.object({ id: objectIdSchema }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50)
  })
};

export const createMessageSchema = {
  params: z.object({ id: objectIdSchema }),
  body: z
    .object({
      message: z.string().trim().min(1, 'Message text is required').max(1000)
    })
    .strict()
};

export type CreateRoomBody = z.infer<typeof createRoomSchema.body>;
export type ListRoomsQuery = z.infer<typeof listRoomsQuerySchema.query>;
export type CreateMessageBody = z.infer<typeof createMessageSchema.body>;
