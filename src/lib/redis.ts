import Redis, { RedisOptions } from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Common connection options
const options: RedisOptions = {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 10) {
      console.error("Redis: max connection retries reached.");
      return null; // Stop retrying after 10 attempts so server won't hang
    }
    return Math.min(times * 100, 2000);
  },
};

// Enable TLS if REDIS_URL uses secure web sockets / TLS (rediss://)
const redisUrl = process.env.REDIS_URL;
if (redisUrl?.startsWith("rediss://")) {
  options.tls = { rejectUnauthorized: false };
}

function createRedisInstance(): Redis {
  if (redisUrl) {
    return new Redis(redisUrl, options);
  }

  return new Redis({
    ...options,
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  });
}

const redis = globalForRedis.redis ?? createRedisInstance();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

redis.on("connect", () => console.log("Redis connected successfully"));
redis.on("error", (err) => console.error("Redis error:", err.message));

export default redis;
