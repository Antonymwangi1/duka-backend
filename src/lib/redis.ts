import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
    redis: Redis | undefined
}

const redis = globalForRedis.redis ?? new Redis(
    process.env.REDIS_URL as string ?? {
        host:     process.env.REDIS_HOST ?? 'localhost',
        port:     Number(process.env.REDIS_PORT) ?? 6379,
        password: process.env.REDIS_PASSWORD,
    },
    {
        retryStrategy: (times) => { 
            const delay = Math.min(times * 50, 2000)
            return delay
        },
        maxRetriesPerRequest: 3,
    }
)

if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = redis
}

redis.on('connect', () => console.log('Redis connected'))
redis.on('error',   (err) => console.error('Redis error:', err))

export default redis