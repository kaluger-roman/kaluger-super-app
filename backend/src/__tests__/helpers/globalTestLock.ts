import { prisma } from "../../lib/prisma";

export const GLOBAL_TEST_LOCK = {
  BACKUP_SETTINGS: 35001,
} as const;

type GlobalTestLockKey = (typeof GLOBAL_TEST_LOCK)[keyof typeof GLOBAL_TEST_LOCK];

// Must cover waiting for other files that hold the same lock plus this file's own run
export const GLOBAL_TEST_LOCK_TIMEOUT_MS = 120000;

// Serializes test files that share global rows (e.g. the BackupSettings singleton)
// across parallel jest workers. The advisory lock lives in an open interactive
// transaction, so Postgres releases it even if the worker dies.
export const acquireGlobalTestLock = async (key: GlobalTestLockKey) => {
  let release = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  let markAcquired = () => {};
  const acquired = new Promise<void>((resolve) => {
    markAcquired = resolve;
  });

  const transaction = prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${key})`;
      markAcquired();
      await released;
    },
    { maxWait: GLOBAL_TEST_LOCK_TIMEOUT_MS, timeout: GLOBAL_TEST_LOCK_TIMEOUT_MS }
  );

  await Promise.race([acquired, transaction]);

  return async () => {
    release();
    await transaction;
  };
};
