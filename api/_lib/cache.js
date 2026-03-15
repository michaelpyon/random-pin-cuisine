const CACHE = globalThis.__rpcCache || new Map()

if (!globalThis.__rpcCache) {
  globalThis.__rpcCache = CACHE
}

export async function withCache(key, ttlMs, loader) {
  const now = Date.now()
  const cached = CACHE.get(key)

  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  const value = await loader()
  CACHE.set(key, {
    value,
    expiresAt: now + ttlMs,
  })
  return value
}

