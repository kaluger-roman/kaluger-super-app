import { validateRequiredEnv } from "../validateEnv";

describe("validateRequiredEnv", () => {
  const snapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...snapshot };
  });

  const REQUIRED = [
    "DATABASE_URL",
    "JWT_SECRET",
    "ADMIN_JWT_SECRET",
    "STUDENT_JWT_SECRET",
  ];

  it("passes when all required secrets are set", () => {
    for (const key of REQUIRED) {
      process.env[key] = "x";
    }
    expect(() => validateRequiredEnv()).not.toThrow();
  });

  it.each(REQUIRED)("throws when %s is missing", (missing) => {
    for (const key of REQUIRED) {
      process.env[key] = "x";
    }
    delete process.env[missing];
    expect(() => validateRequiredEnv()).toThrow(
      new RegExp(`Missing.*${missing}`)
    );
  });

  it("throws when a secret is set but empty", () => {
    for (const key of REQUIRED) {
      process.env[key] = "x";
    }
    process.env.STUDENT_JWT_SECRET = "   ";
    expect(() => validateRequiredEnv()).toThrow(/STUDENT_JWT_SECRET/);
  });
});
