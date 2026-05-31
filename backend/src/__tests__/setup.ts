import path from "path";
import fs from "fs";
import dotenv from "dotenv";

const envPath = path.resolve(__dirname, "..", "..", ".env.test");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || "test-admin-jwt-secret";
process.env.STUDENT_JWT_SECRET =
  process.env.STUDENT_JWT_SECRET || "test-student-jwt-secret";
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || "re_test_dummy";

jest.setTimeout(10000);

import prisma from "../lib/prisma";
import { __clearStudentTokenVersionCacheForTests } from "../lib/studentTokenVersionCache";
import { __clearTokenVersionCacheForTests } from "../lib/tokenVersionCache";

// The in-process tokenVersion cache survives within a jest worker; clear it
// between tests so that controllers/services manipulating user.tokenVersion
// directly (e.g. forcing a verified state) cannot be served stale.
beforeEach(() => {
  __clearTokenVersionCacheForTests();
  __clearStudentTokenVersionCacheForTests();
});

afterAll(async () => {
  try {
    await prisma.$disconnect();
  } catch (_) {
    // ignore
  }
});
