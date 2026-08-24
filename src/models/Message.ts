import mongoose, { Schema } from 'mongoose';
import type { IMessage, MessageKind } from '../types';

const messageSchema = new Schema<IMessage>(
  {
    room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    senderName: { type: String, required: true },
    kind: { type: String, enum: ['chat', 'system'] satisfies MessageKind[], default: 'chat' },
    text: { type: String, required: true, maxlength: 1000 }
  },
  { timestamps: true }
);

messageSchema.index({ room: 1, createdAt: -1 });

messageSchema.set('toJSON', {
  transform(_doc, ret) {
    const sanitized = ret as unknown as Record<string, unknown>;
    delete sanitized.__v;
    return sanitized;
  }
});

export const Message = mongoose.model<IMessage>('Message', messageSchema);
