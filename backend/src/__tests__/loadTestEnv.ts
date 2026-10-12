import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Runs as a jest `setupFiles` entry, before any module of the test is required. Loading it from
// setup.ts was too late: imports are hoisted above the dotenv call, so requiring the Prisma client
// first pulled DATABASE_URL from backend/.env and every local run hit the dev database.
// `override` lets .env.test win over backend/.env and the shell; CI has no file and keeps its env.
const TEST_ENV_PATH = path.resolve(__dirname, "..", "..", ".env.test");

if (fs.existsSync(TEST_ENV_PATH)) dotenv.config({ path: TEST_ENV_PATH, override: true });

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "test-admin-jwt-secret";
process.env.STUDENT_JWT_SECRET = process.env.STUDENT_JWT_SECRET || "test-student-jwt-secret";
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || "re_test_dummy";
