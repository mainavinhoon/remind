import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

/** Lazy singleton — safe to import at module level without crashing at build time */
export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}
