import type { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

type StorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;
const script = `
local blocked = redis.call('PTTL', KEYS[1] .. ':blocked')
if blocked > 0 then return {0, redis.call('PTTL', KEYS[1]), 1, blocked} end
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local expires = redis.call('PTTL', KEYS[1])
if hits > tonumber(ARGV[2]) then
  local duration = tonumber(ARGV[3])
  if duration <= 0 then duration = tonumber(ARGV[1]) end
  redis.call('SET', KEYS[1] .. ':blocked', '1', 'PX', duration)
  return {hits, expires, 1, duration}
end
return {hits, expires, 0, 0}
`;
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly redis: Redis;
  constructor(url: string) { this.redis = new Redis(url, { maxRetriesPerRequest: 2, enableOfflineQueue: true }); }
  async increment(key: string, ttl: number, limit: number, blockDuration: number, throttlerName: string): Promise<StorageRecord> { const result = await this.redis.eval(script, 1, `throttle:${throttlerName}:${key}`, ttl, limit, blockDuration) as [number, number, number, number]; return { totalHits: Number(result[0]), timeToExpire: Math.max(0, Number(result[1])), isBlocked: Number(result[2]) === 1, timeToBlockExpire: Math.max(0, Number(result[3])) }; }
}
