type CacheEntry<T> = {
  data: T;
  timestamp: number;
  revalidating: boolean;
};

const cache = new Map<string, CacheEntry<any>>();

if (typeof window !== 'undefined') {
  (window as any).cache = cache;
}

// const keyAliases = new Map<string, string>(); // alias → canonical
// const keyDependents = new Map<string, Set<string>>(); // dependency → set of keys that depend on it
const FRESH_TIME = 30_000; // 30 seconds - data is fresh, no background check
const STALE_TIME = 10 * 60_000; // 10 minutes - serve stale + background fetch, after this refetch blocking

// function resolveKey(key: string): string {
//   return keyAliases.get(key) ?? key;
// }

// export function addKeyAlias(canonicalKey: string, aliasKey: string) {
//   keyAliases.set(aliasKey, canonicalKey);
// }

// // Register that `key` depends on `dependencyKey` - when dependencyKey is invalidated, key is too
// export function addCacheDependency(key: string, dependencyKey: string) {
//   const canonicalKey = resolveKey(key);
//   const canonicalDep = resolveKey(dependencyKey);
//   if (!keyDependents.has(canonicalDep)) {
//     keyDependents.set(canonicalDep, new Set());
//   }
//   keyDependents.get(canonicalDep)!.add(canonicalKey);
// }

let revalidateCallback: (() => void) | null = null;

export function setRevalidateCallback(cb: (() => void) | null) {
  revalidateCallback = cb;
}

export function revalidate() {
  if (revalidateCallback) {
    revalidateCallback();
  }
}

export function hasRevalidateCallback() {
  return revalidateCallback !== null;
}

export function invalidateByPrefix(prefix: string) {
  // Collect keys first to avoid mutating while iterating
  const keysToInvalidate = [...cache.keys()].filter(key => key.startsWith(prefix));
  for (const key of keysToInvalidate) {
    invalidateCache(key);
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
          revalidate();
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

  console.log('[cache] cache miss: ' + key);
  // No cache or expired - fetch and store (blocking)
  const data = await fetcher();
  cache.set(key, { data, timestamp: now, revalidating: false });
  return data;
}

export function invalidateCache(key?: string) {
  if (key) {
    console.log('[cache] invalidating key: ' + key);
    cache.delete(key);
  } else {
    cache.clear();
  }
}

export function getCachedValue<T>(key: string): T | undefined {
  const entry = cache.get(key);
  return entry?.data;
}

// export function updateCache(key: string, data: any) {)
//   const canonicalKey = resolveKey(key);
//   cache.set(canonicalKey, { data, timestamp: Date.now(), revalidating: false });
// }