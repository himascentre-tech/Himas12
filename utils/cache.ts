
type CacheEntry = {
  data: any;
  time: number;
};

const memoryCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<any>>();

/**
 * Robust caching helper to reduce API egress.
 * @param key Unique identifier for the cache entry
 * @param fetcher Async function to retrieve fresh data
 * @param ttl Time-to-live in milliseconds (default 60s)
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 60000
): Promise<T> {
  const now = Date.now();

  // 1. Check Deduplication (Prevent multiple identical calls at once)
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key);
  }

  // 2. Check Memory Cache (L1)
  const memoryItem = memoryCache.get(key);
  if (memoryItem && now - memoryItem.time < ttl) {
    return memoryItem.data as T;
  }

  // 3. Check LocalStorage Cache (L2)
  try {
    const localItem = localStorage.getItem(`cache_${key}`);
    if (localItem) {
      const parsed: CacheEntry = JSON.parse(localItem);
      if (now - parsed.time < ttl) {
        // Hydrate L1 from L2
        memoryCache.set(key, parsed);
        return parsed.data as T;
      }
    }
  } catch (e) {
    console.warn("Cache hydration failed", e);
  }

  // 4. Fetch Fresh Data with Deduplication
  const fetchPromise = (async () => {
    try {
      const data = await fetcher();
      const entry: CacheEntry = { data, time: now };

      // Update both layers
      memoryCache.set(key, entry);
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
      } catch (e) {
        // Handle storage quota issues
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          localStorage.clear();
        }
      }

      return data;
    } finally {
      // Always clear inflight tracker
      inflightRequests.delete(key);
    }
  })();

  inflightRequests.set(key, fetchPromise);
  return fetchPromise;
}

/**
 * Manually invalidate or update a cache entry
 */
export function updateCache(key: string, data: any) {
  const entry = { data, time: Date.now() };
  memoryCache.set(key, entry);
  localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
}

export function invalidateCache(key: string) {
  memoryCache.delete(key);
  localStorage.removeItem(`cache_${key}`);
}
