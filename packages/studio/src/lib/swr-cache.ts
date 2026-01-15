type CacheEntry<T> = {
  data: T;
  timestamp: number;
  revalidating: boolean;
};

const cache = new Map<string, CacheEntry<any>>();
const STALE_TIME = 10_000; // 10 seconds

let revalidateCallback: (() => void) | null = null;

export function setRevalidateCallback(cb: (() => void) | null) {
  revalidateCallback = cb;
}

export async function swr<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const entry = cache.get(key);
  const now = Date.now();

  // If we have cached data
  if (entry) {
    const isStale = now - entry.timestamp > STALE_TIME;

    // Background revalidate if stale and not already revalidating
    if (isStale && !entry.revalidating) {
      entry.revalidating = true;
      fetcher().then(newData => {
        const changed = JSON.stringify(newData) !== JSON.stringify(entry.data);
        cache.set(key, { data: newData, timestamp: Date.now(), revalidating: false });
        if (changed && revalidateCallback) {
          revalidateCallback();
        }
      }).catch(() => {
        entry.revalidating = false;
      });
    }

    return entry.data;
  }

  // No cache - fetch and store
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
