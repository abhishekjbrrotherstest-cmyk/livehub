import { redis } from '../config/redis';

const ONLINE_KEY = 'presence:online';
const STALE_AFTER_MS = 90_000;

const connectionKey = (userId: string) => `conn:${userId}`;
const roomParticipantsKey = (roomId: string) => `room:${roomId}:participants`;

export const presence = {
  async markOnline(userId: string): Promise<void> {
    const pipeline = redis.pipeline();
    pipeline.zadd(ONLINE_KEY, Date.now(), userId);
    pipeline.incr(connectionKey(userId));
    pipeline.expire(connectionKey(userId), 86_400);
    await pipeline.exec();
  },

  async heartbeat(userId: string): Promise<void> {
    await redis.zadd(ONLINE_KEY, Date.now(), userId);
  },

  async getConnectionCount(userId: string): Promise<number> {
    const value = await redis.get(connectionKey(userId));
    return value ? Number(value) : 0;
  },

  async markOffline(userId: string): Promise<boolean> {
    const pipeline = redis.pipeline();
    pipeline.zrem(ONLINE_KEY, userId);
    pipeline.decr(connectionKey(userId));
    const results = await pipeline.exec();
    let remaining = 1;
    if (results) {
      const decrEntry = results[1];
      if (decrEntry && !decrEntry[0]) remaining = Number(decrEntry[1]);
    }
    if (remaining <= 0) await redis.del(connectionKey(userId));
    return remaining <= 0;
  },

  async isOnline(userId: string): Promise<boolean> {
    const score = await redis.zscore(ONLINE_KEY, userId);
    if (score === null) return false;
    return Date.now() - Number(score) < STALE_AFTER_MS;
  },

  async getOnlineUserIds(): Promise<string[]> {
    await this.pruneStale();
    const cutoff = Date.now() - STALE_AFTER_MS;
    return redis.zrangebyscore(ONLINE_KEY, cutoff, '+inf');
  },

  async getOnlineCount(): Promise<number> {
    await this.pruneStale();
    return redis.zcard(ONLINE_KEY);
  },

  async pruneStale(): Promise<void> {
    await this.reapStale();
  },

  async reapStale(): Promise<string[]> {
    const cutoff = Date.now() - STALE_AFTER_MS;
    const stale = await redis.zrangebyscore(ONLINE_KEY, '-inf', cutoff);
    if (stale.length > 0) {
      await redis.zrem(ONLINE_KEY, ...stale);
    }
    return stale;
  },

  async joinRoomParticipants(roomId: string, userId: string): Promise<void> {
    await redis.sadd(roomParticipantsKey(roomId), userId);
    await redis.expire(roomParticipantsKey(roomId), 86_400);
  },

  async leaveRoomParticipants(roomId: string, userId: string): Promise<void> {
    await redis.srem(roomParticipantsKey(roomId), userId);
  },

  async clearRoomParticipants(roomId: string): Promise<void> {
    await redis.del(roomParticipantsKey(roomId));
  },

  async getParticipantIds(roomId: string): Promise<string[]> {
    return redis.smembers(roomParticipantsKey(roomId));
  },

  async getParticipantCount(roomId: string): Promise<number> {
    return redis.scard(roomParticipantsKey(roomId));
  }
};
