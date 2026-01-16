type CacheEntry<T> = {
  data: T;
  timestamp: number;
  revalidating: boolean;
};

type ChangeListener = (key: string, oldData: unknown, newData: unknown) => void;

const cache = new Map<string, CacheEntry<any>>();
const FRESH_TIME = 30_000; // 30 seconds - data is fresh, no background check
const STALE_TIME = 10 * 60_000; // 10 minutes - serve stale + background fetch, after this refetch blocking
const changeListeners = new Set<ChangeListener>();

let revalidateCallback: (() => void) | null = null;

export function setRevalidateCallback(cb: (() => void) | null) {
  revalidateCallback = cb;
}

export function subscribeToChanges(cb: ChangeListener): () => void {
  changeListeners.add(cb);
  return () => changeListeners.delete(cb);
}

export function invalidateByPrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

export async function swr<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const entry = cache.get(key);
  const now = Date.now();

  // If we have cached data
  if (entry) {
    const age = now - entry.timestamp;
    const isFresh = age <= FRESH_TIME;
    const isStale = age > FRESH_TIME && age <= STALE_TIME;
    const isExpired = age > STALE_TIME;

    // Fresh: return immediately, no background fetch
    if (isFresh) {
      return entry.data;
    }

    // Stale: return immediately, background fetch
    if (isStale && !entry.revalidating) {
      entry.revalidating = true;
      fetcher().then(newData => {
        const oldData = entry.data;
        const changed = JSON.stringify(newData) !== JSON.stringify(oldData);
        cache.set(key, { data: newData, timestamp: Date.now(), revalidating: false });
        if (changed) {
          for (const listener of changeListeners) {
            listener(key, oldData, newData);
          }
          if (revalidateCallback) {
            revalidateCallback();
          }
        }
      }).catch(() => {
        entry.revalidating = false;
      });
      return entry.data;
    }

    // Still stale but already revalidating - return cached
    if (isStale && entry.revalidating) {
      return entry.data;
    }

    // Expired: fall through to blocking fetch
  }

  // No cache or expired - fetch and store (blocking)
  const data = await fetcher();
  cache.set(key, { data, timestamp: now, revalidating: false });
  return data;
}

export function invalidateCache(key?: string) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}
