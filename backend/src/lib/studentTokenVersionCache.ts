type CacheEntry = { tokenVersion: number; expiresAt: number };

const CACHE_TTL_MS = 30_000;

const cache = new Map<string, CacheEntry>();

export const getCachedStudentTokenVersion = (
  studentUserId: string
): number | undefined => {
  const entry = cache.get(studentUserId);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(studentUserId);
    return undefined;
  }
  return entry.tokenVersion;
};

export const setCachedStudentTokenVersion = (
  studentUserId: string,
  tokenVersion: number
): void => {
  cache.set(studentUserId, {
    tokenVersion,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
};

export const invalidateCachedStudentTokenVersion = (
  studentUserId: string
): void => {
  cache.delete(studentUserId);
};

export const __clearStudentTokenVersionCacheForTests = (): void => {
  cache.clear();
};
