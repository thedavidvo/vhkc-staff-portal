// Simple in-memory cache for server-side API responses
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class Cache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    // Default TTL: 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl) {
      // Entry has expired
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    // Invalidate all keys matching a pattern (e.g., "drivers:*")
    const keys = Array.from(this.cache.keys());
    keys.forEach((key) => {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  clear(): void {
    this.cache.clear();
  }

  // Get stats for debugging
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    return {
      totalEntries: entries.length,
      validEntries: entries.filter(([_, entry]) => now - entry.timestamp <= entry.ttl).length,
      expiredEntries: entries.filter(([_, entry]) => now - entry.timestamp > entry.ttl).length,
    };
  }
}

// Export a singleton instance
export const cache = new Cache();










