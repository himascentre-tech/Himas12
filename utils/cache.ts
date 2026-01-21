
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
        if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
          console.warn("LocalStorage quota exceeded during fetch. Using memory only.");
          // Attempt to clear some space for the future
          const keys = Object.keys(localStorage);
          for (let i = 0; i < Math.min(keys.length, 5); i++) {
            if (keys[i].startsWith('cache_')) localStorage.removeItem(keys[i]);
          }
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
  
  // Always update memory (L1) as it is reliable
  memoryCache.set(key, entry);
  
  // Try to update LocalStorage (L2) but fail gracefully
  try {
    localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.error("Local storage full. Clearing old hospital caches...");
      
      // Remove all entries starting with 'cache_' to free up space
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('cache_')) {
          localStorage.removeItem(k);
        }
      });
      
      // Try one more time silently
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
      } catch (e2) {
        // If still failing, it means this single object is likely > 5MB. 
        // We just stop trying and rely on Memory/Supabase.
        console.warn("Cache object too large for browser storage. Relying on memory state.");
      }
    }
  }
}

export function invalidateCache(key: string) {
  memoryCache.delete(key);
  localStorage.removeItem(`cache_${key}`);
}
