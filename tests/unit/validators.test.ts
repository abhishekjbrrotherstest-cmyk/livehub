import { describe, expect, it } from 'vitest';
import { registerSchema, loginSchema } from '../../src/validators/auth.schema';
import { createRoomSchema, roomIdParamSchema } from '../../src/validators/room.schema';
import { livekitTokenSchema } from '../../src/validators/livekit.schema';

describe('auth schemas', () => {
  it('accepts a valid registration', () => {
    const result = registerSchema.body.safeParse({
      name: 'Abhishek',
      email: 'USER@Example.COM',
      password: 'secret123'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
      expect(result.data.profileImage).toBeUndefined();
    }
  });

  it('rejects weak passwords', () => {
    const result = registerSchema.body.safeParse({
      name: 'Abhishek',
      email: 'user@example.com',
      password: 'short'
    });
    expect(result.success).toBe(false);
  });

  it('rejects passwords without numbers', () => {
    const result = registerSchema.body.safeParse({
      name: 'Abhishek',
      email: 'user@example.com',
      password: 'onlyletters'
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = loginSchema.body.safeParse({
      email: 'user@example.com',
      password: 'secret123',
      isAdmin: true
    });
    expect(result.success).toBe(false);
  });
});

describe('room schemas', () => {
  it('validates room creation body', () => {
    expect(createRoomSchema.body.safeParse({ name: 'Voice Lounge' }).success).toBe(true);
    expect(createRoomSchema.body.safeParse({ name: 'ab' }).success).toBe(false);
    expect(createRoomSchema.body.safeParse({}).success).toBe(false);
  });

  it('validates room id params', () => {
    expect(roomIdParamSchema.params.safeParse({ id: '64b64b64b64b64b64b64b64b' }).success).toBe(true);
    expect(roomIdParamSchema.params.safeParse({ id: 'not-an-id' }).success).toBe(false);
  });
});

describe('livekit token schema', () => {
  it('defaults role to participant', () => {
    const result = livekitTokenSchema.body.safeParse({ roomName: 'room-123' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.role).toBe('participant');
  });

  it('rejects invalid role and roomName', () => {
    expect(livekitTokenSchema.body.safeParse({ roomName: 'room', role: 'admin' }).success).toBe(false);
    expect(livekitTokenSchema.body.safeParse({ roomName: 'bad room name!' }).success).toBe(false);
  });
});
