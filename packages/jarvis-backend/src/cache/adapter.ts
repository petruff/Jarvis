/**
 * Cache Adapter — Supports multiple backends
 *
 * Dev (default): In-memory Map
 * Prod: Redis
 */

export interface CacheAdapter {
  set(key: string, value: any, ttl?: number): Promise<void>;
  get(key: string): Promise<any>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;
}

class InMemoryCache implements CacheAdapter {
  private cache: Map<string, { value: any; expires?: number }> = new Map();

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const expires = ttl ? Date.now() + ttl * 1000 : undefined;
    this.cache.set(key, { value, expires });
  }

  async get(key: string): Promise<any> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (item.expires && item.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

export function createCacheAdapter(): CacheAdapter {
  if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    // Production: use Redis
    throw new Error(
      'Redis not yet configured. Please set up redis client and provide REDIS_HOST, REDIS_PORT environment variables'
    );
  }

  // Development: use in-memory cache
  console.log('[Cache] Using in-memory cache (dev mode)');
  return new InMemoryCache();
}
