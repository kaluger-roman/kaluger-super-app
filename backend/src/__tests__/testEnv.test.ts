import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { prisma } from "../lib/prisma";

// Not imported from loadTestEnv: importing it would apply .env.test here and hide a broken setup.
const TEST_ENV_PATH = path.resolve(__dirname, "..", "..", ".env.test");

const expectedDatabaseUrl =
  process.env.TEST_DATABASE_URL ||
  (fs.existsSync(TEST_ENV_PATH)
    ? dotenv.parse(fs.readFileSync(TEST_ENV_PATH)).DATABASE_URL
    : process.env.DATABASE_URL);

const databaseName = (url: string | undefined) => new URL(url ?? "").pathname.slice(1);

describe("test environment", () => {
  it("should expose DATABASE_URL from TEST_DATABASE_URL or .env.test even when backend/.env exists", () => {
    expect(process.env.DATABASE_URL).toBe(expectedDatabaseUrl);
  });

  it("should connect Prisma to the test database", async () => {
    const [{ current_database }] = await prisma.$queryRaw<
      Array<{ current_database: string }>
    >`SELECT current_database()`;

    expect(current_database).toBe(databaseName(expectedDatabaseUrl));
  });
});
