import { Router } from 'express';
import * as roomController from '../controllers/room.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import {
  createMessageSchema,
  createRoomSchema,
  listMessagesSchema,
  listRoomsQuerySchema,
  roomIdParamSchema
} from '../validators/room.schema';

const router = Router();

router.use(authenticate);

router.post('/', validate(createRoomSchema), roomController.createRoom);
router.get('/', validate(listRoomsQuerySchema), roomController.listRooms);
router.get('/:id', validate(roomIdParamSchema), roomController.getRoom);
router.get('/:id/messages', validate(listMessagesSchema), roomController.listMessages);
router.post('/:id/messages', validate(createMessageSchema), roomController.postMessage);
router.post('/:id/join', validate(roomIdParamSchema), roomController.joinRoom);
router.post('/:id/leave', validate(roomIdParamSchema), roomController.leaveRoom);

export default router;
