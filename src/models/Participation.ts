import mongoose, { Schema } from 'mongoose';
import type { IParticipation } from '../types';

const participationSchema = new Schema<IParticipation>(
  {
    room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['host', 'participant'], default: 'participant' },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null }
  },
  { timestamps: false }
);

participationSchema.index({ room: 1, user: 1, leftAt: 1 });
participationSchema.index({ user: 1, leftAt: 1 });

export const Participation = mongoose.model<IParticipation>('Participation', participationSchema);
