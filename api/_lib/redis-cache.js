import Redis from 'ioredis'

// ---------------------------------------------------------------------------
// In-memory fallback (same behaviour as the original cache.js)
// ---------------------------------------------------------------------------
const MEM = globalThis.__rpcCache || new Map()
if (!globalThis.__rpcCache) {
  globalThis.__rpcCache = MEM
}

// ---------------------------------------------------------------------------
// Redis connection (lazy, singleton)
// ---------------------------------------------------------------------------
let redis = null
let redisAvailable = false

function getRedis() {
  if (redis) return redis

  const url = process.env.REDIS_URL
  if (!url) return null

  redis = new Redis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    lazyConnect: true,
  })

  redis.on('error', (err) => {
    if (redisAvailable) {
      console.warn('[redis-cache] Redis error, falling back to in-memory cache:', err.message)
    }
    redisAvailable = false
  })

  redis.on('connect', () => {
    redisAvailable = true
  })

  // Attempt initial connection without blocking callers on failure.
  redis.connect().catch(() => {
    redisAvailable = false
  })

  return redis
}

// ---------------------------------------------------------------------------
// Public API  –  withCache(key, ttlMs, loader)
//
// Exact same signature as the original cache.js so the rest of the code
// doesn't need to change beyond the import path.
// ---------------------------------------------------------------------------

export async function withCache(key, ttlMs, loader) {
  const client = getRedis()

  // ---- Try Redis first ----
  if (client && redisAvailable) {
    try {
      const raw = await client.get(key)
      if (raw !== null) {
        return JSON.parse(raw)
      }
    } catch (err) {
      console.warn('[redis-cache] Redis GET failed, trying in-memory:', err.message)
    }
  }

  // ---- In-memory fallback (read) ----
  const now = Date.now()
  const memEntry = MEM.get(key)
  if (memEntry && memEntry.expiresAt > now) {
    return memEntry.value
  }

  // ---- Cache miss – call the loader ----
  const value = await loader()

  // ---- Write to Redis ----
  if (client && redisAvailable) {
    const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000))
    try {
      await client.setex(key, ttlSeconds, JSON.stringify(value))
    } catch (err) {
      console.warn('[redis-cache] Redis SETEX failed, using in-memory only:', err.message)
    }
  }

  // ---- Always write to in-memory as well (fast local reads & fallback) ----
  MEM.set(key, { value, expiresAt: now + ttlMs })

  return value
}
