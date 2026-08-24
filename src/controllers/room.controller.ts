import { User } from '../models/User';
import * as roomService from '../services/room.service';
import * as messageService from '../services/message.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import type { CreateMessageBody, CreateRoomBody, ListRoomsQuery } from '../validators/room.schema';

export const createRoom = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const body = req.body as CreateRoomBody;
  const room = await roomService.createRoom(req.user, body.name);
  sendSuccess(res, { status: 201, message: 'Room created', data: room });
});

export const listRooms = asyncHandler(async (req, res) => {
  const query = req.query as unknown as ListRoomsQuery;
  const result = await roomService.listRooms(query);
  sendSuccess(res, {
    message: 'Rooms fetched',
    data: result.items,
    meta: result.meta
  });
});

export const getRoom = asyncHandler(async (req, res) => {
  const room = await roomService.getRoomById(req.params.id);
  sendSuccess(res, { message: 'Room fetched', data: room });
});

export const joinRoom = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const result = await roomService.joinRoom(req.user.id, req.params.id);
  sendSuccess(res, { message: 'Joined room', data: result });
});

export const leaveRoom = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const result = await roomService.leaveRoom(req.user.id, req.params.id);
  sendSuccess(res, {
    message: result.ended ? 'You left and the room has ended' : 'Left room',
    data: result
  });
});

export const listMessages = asyncHandler(async (req, res) => {
  const query = req.query as unknown as ListRoomsQuery;
  const result = await messageService.listMessages(req.params.id, query.page ?? 1, query.limit ?? 50);
  sendSuccess(res, { message: 'Messages fetched', data: result.items, meta: result.meta });
});

export const postMessage = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const body = req.body as CreateMessageBody;
  const user = await User.findById(req.user.id).select('name').lean<{ name?: string } | null>();
  if (!user) throw ApiError.unauthorized('User no longer exists');
  const saved = await messageService.createMessage({
    roomId: req.params.id,
    senderId: req.user.id,
    senderName: user.name ?? 'Unknown',
    text: body.message
  });
  sendSuccess(res, { status: 201, message: 'Message sent', data: saved });
});
