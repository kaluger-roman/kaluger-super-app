type CacheEntry = { tokenVersion: number; expiresAt: number };

const CACHE_TTL_MS = 30_000;

const cache = new Map<string, CacheEntry>();

export const getCachedStudentTokenVersion = (studentUserId: string): number | undefined => {
  const entry = cache.get(studentUserId);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(studentUserId);
    return undefined;
  }
  return entry.tokenVersion;
};

// Versions only grow: a lookup that read the DB before a revocation must not put the old
// version back over the one the revocation stored.
export const setCachedStudentTokenVersion = (studentUserId: string, tokenVersion: number): void => {
  const current = getCachedStudentTokenVersion(studentUserId);
  if (current !== undefined && current > tokenVersion) return;
  cache.set(studentUserId, {
    tokenVersion,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
};

export const __clearStudentTokenVersionCacheForTests = (): void => {
  cache.clear();
};
