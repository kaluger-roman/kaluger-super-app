import { prisma } from "../lib/prisma";
import { __clearStudentTokenVersionCacheForTests } from "../lib/studentTokenVersionCache";
import { __clearTokenVersionCacheForTests } from "../lib/tokenVersionCache";
import { __resetLiveCallsForTests } from "../services/callSignaling/callSignaling";
import { __resetInviteRateLimitForTests } from "../services/callSignaling/inviteRateLimit";

jest.setTimeout(10000);

// The in-process tokenVersion cache survives within a jest worker; clear it
// between tests so that controllers/services manipulating user.tokenVersion
// directly (e.g. forcing a verified state) cannot be served stale.
beforeEach(() => {
  __clearTokenVersionCacheForTests();
  __clearStudentTokenVersionCacheForTests();
  // Live calls and invite counters are module state as well.
  __resetLiveCallsForTests();
  __resetInviteRateLimitForTests();
});

afterAll(async () => {
  try {
    await prisma.$disconnect();
  } catch (_) {
    // ignore
  }
});
