// In-process cache for User.tokenVersion lookups performed by the
// authenticateToken middleware. Without this every authenticated request
// would hit Postgres for a single integer column; on a logged-in user
// poking the dashboard, that compounds quickly (and turns transient DB
// blips into 500s across all endpoints).
//
// The cache is short-lived (30s) so password/email-change revocations
// converge fast even without explicit invalidation. Services that bump
// tokenVersion (changePassword, verifyEmailChange, applyPasswordReset)
// should also call `setCachedTokenVersion(userId, newVersion)` so the
// fresh JWT they mint passes the very next middleware check without
// another DB roundtrip.

type CacheEntry = { tokenVersion: number; expiresAt: number };

const CACHE_TTL_MS = 30_000;

const cache = new Map<string, CacheEntry>();

export const getCachedTokenVersion = (userId: string): number | undefined => {
  const entry = cache.get(userId);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(userId);
    return undefined;
  }
  return entry.tokenVersion;
};

export const setCachedTokenVersion = (
  userId: string,
  tokenVersion: number,
): void => {
  cache.set(userId, {
    tokenVersion,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
};

export const invalidateCachedTokenVersion = (userId: string): void => {
  cache.delete(userId);
};

// Test-only helper: clears the entire cache between tests so that mocks of
// `prisma.user.findUnique` are not skipped due to a prior real lookup.
export const __clearTokenVersionCacheForTests = (): void => {
  cache.clear();
};
