import { User } from '../models/User';
import * as livekitService from '../services/livekit.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import type { LiveKitTokenBody } from '../validators/livekit.schema';

export const createToken = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const body = req.body as LiveKitTokenBody;

  const user = await User.findById(req.user.id).select('name');
  if (!user) throw ApiError.unauthorized('User no longer exists');

  const token = await livekitService.createLiveKitToken({
    identity: req.user.id,
    name: user.name,
    roomName: body.roomName,
    role: body.role
  });

  sendSuccess(res, { message: 'LiveKit token generated', data: token });
});

export const webhook = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  const rawBody =
    typeof req.body === 'string'
      ? req.body
      : Buffer.isBuffer(req.body)
        ? (req.body as Buffer).toString('utf8')
        : JSON.stringify(req.body ?? {});
  try {
    const event = await livekitService.verifyLiveKitWebhook(rawBody, authHeader);
    await livekitService.processLiveKitEvent(event);
    sendSuccess(res, { message: 'Webhook received', data: { event: event.event } });
  } catch {
    throw ApiError.unauthorized('Invalid webhook signature');
  }
});
