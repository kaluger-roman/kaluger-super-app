import { jest } from "@jest/globals";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

const envPath = path.resolve(__dirname, "..", "..", ".env.test");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

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
