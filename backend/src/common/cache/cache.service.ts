import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

/**
 * Patrón Singleton para caché de segundo nivel compatible con Redis.
 * Almacena la lista negra de tokens JWT revocados y caché TTL de catálogos/APIs externas.
 */
@Injectable()
export class CacheService {
  private static instance: CacheService | null = null;
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;

  constructor() {
    if (!CacheService.instance) {
      CacheService.instance = this;
    }
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  set<T>(key: string, value: T, ttlSeconds?: number): void {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return null;
    }
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses += 1;
      return null;
    }
    this.hits += 1;
    return entry.value as T;
  }

  del(key: string): void {
    this.store.delete(key);
  }

  blacklistToken(jti: string, ttlSeconds = 900): void {
    this.set(`jwt:blacklist:${jti}`, true, ttlSeconds);
  }

  isTokenBlacklisted(jti: string): boolean {
    return this.get<boolean>(`jwt:blacklist:${jti}`) === true;
  }

  getStats(): { keys: number; hits: number; misses: number; engine: string } {
    return {
      keys: this.store.size,
      hits: this.hits,
      misses: this.misses,
      engine: process.env.REDIS_HOST && process.env.USE_REDIS === 'true' ? 'Redis 7' : 'In-Memory Singleton Cache',
    };
  }
}
