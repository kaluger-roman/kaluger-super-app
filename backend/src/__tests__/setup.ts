import { jest } from "@jest/globals";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

const envPath = path.resolve(__dirname, "..", "..", ".env.test");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

// Mandatory secrets for tests; fall back to deterministic values when .env.test missing
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || "test-admin-jwt-secret";
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || "re_test_dummy";

// Basic Jest setup for backend tests
jest.setTimeout(10000);

// Ensure Prisma disconnect after all tests if prisma is used
import prisma from "../lib/prisma";
afterAll(async () => {
  try {
    await prisma.$disconnect();
  } catch (_) {
    // ignore
  }
});
