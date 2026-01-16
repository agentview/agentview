type CacheEntry<T> = {
  data: T;
  timestamp: number;
  revalidating: boolean;
};

type ChangeListener = (key: string, oldData: unknown, newData: unknown) => void;

const cache = new Map<string, CacheEntry<any>>();

if (typeof window !== 'undefined') {
  (window as any).cache = cache;
}

const keyAliases = new Map<string, string>(); // alias → canonical
const keyDependents = new Map<string, Set<string>>(); // dependency → set of keys that depend on it
const FRESH_TIME = 30_000; // 30 seconds - data is fresh, no background check
const STALE_TIME = 10 * 60_000; // 10 minutes - serve stale + background fetch, after this refetch blocking
const changeListeners = new Set<ChangeListener>();

function resolveKey(key: string): string {
  return keyAliases.get(key) ?? key;
}

export function addKeyAlias(canonicalKey: string, aliasKey: string) {
  keyAliases.set(aliasKey, canonicalKey);
}

// Register that `key` depends on `dependencyKey` - when dependencyKey is invalidated, key is too
export function addCacheDependency(key: string, dependencyKey: string) {
  const canonicalKey = resolveKey(key);
  const canonicalDep = resolveKey(dependencyKey);
  if (!keyDependents.has(canonicalDep)) {
    keyDependents.set(canonicalDep, new Set());
  }
  keyDependents.get(canonicalDep)!.add(canonicalKey);
}

let revalidateCallback: (() => void) | null = null;

export function setRevalidateCallback(cb: (() => void) | null) {
  revalidateCallback = cb;
}

export function subscribeToChanges(cb: ChangeListener): () => void {
  changeListeners.add(cb);
  return () => changeListeners.delete(cb);
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
  const canonicalKey = resolveKey(key);
  const entry = cache.get(canonicalKey);
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
        cache.set(canonicalKey, { data: newData, timestamp: Date.now(), revalidating: false });
        if (changed) {
          for (const listener of changeListeners) {
            listener(canonicalKey, oldData, newData);
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

  console.log('[cache] cache miss: ' + key);
  // No cache or expired - fetch and store (blocking)
  const data = await fetcher();
  cache.set(canonicalKey, { data, timestamp: now, revalidating: false });
  return data;
}

export function invalidateCache(key?: string) {
  if (key) {
    console.log('[cache] invalidating key: ' + key);
    const canonicalKey = resolveKey(key);
    cache.delete(canonicalKey);

    // Clean up aliases pointing to this key
    for (const [alias, target] of keyAliases) {
      if (target === canonicalKey) {
        keyAliases.delete(alias);
      }
    }

    // Recursively invalidate any keys that depend on this one
    const dependents = keyDependents.get(canonicalKey);
    if (dependents) {
      keyDependents.delete(canonicalKey); // Delete first to avoid infinite loops
      for (const depKey of dependents) {
        invalidateCache(depKey);
      }
    }
  } else {
    cache.clear();
    keyAliases.clear();
    keyDependents.clear();
  }
}
