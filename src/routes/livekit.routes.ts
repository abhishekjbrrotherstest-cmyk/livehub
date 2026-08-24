import { Router } from 'express';
import * as livekitController from '../controllers/livekit.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { livekitTokenSchema } from '../validators/livekit.schema';

const router = Router();

router.post('/token', authenticate, validate(livekitTokenSchema), livekitController.createToken);
router.post('/webhook', livekitController.webhook);

export default router;
