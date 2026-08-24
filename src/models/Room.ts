import mongoose, { Schema } from 'mongoose';
import type { IRoom, RoomStatus } from '../types';

const roomSchema = new Schema<IRoom>(
  {
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      minlength: [3, 'Room name must be at least 3 characters'],
      maxlength: [80, 'Room name must be at most 80 characters']
    },
    host: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['active', 'ended'] satisfies RoomStatus[], default: 'active', index: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    endedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

roomSchema.index({ status: 1, createdAt: -1 });

roomSchema.virtual('participantCount').get(function participantCount() {
  return this.participants.length;
});

roomSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    const sanitized = ret as unknown as Record<string, unknown>;
    delete sanitized.__v;
    return sanitized;
  }
});

export const Room = mongoose.model<IRoom>('Room', roomSchema);
