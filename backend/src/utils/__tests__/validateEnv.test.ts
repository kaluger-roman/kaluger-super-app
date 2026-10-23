import { validateDeployEnv, validateRequiredEnv } from "../validateEnv";

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
    "RESEND_API_KEY",
    "EMAIL_FROM",
    "FRONTEND_URL",
    "VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_SUBJECT",
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
    expect(() => validateRequiredEnv()).toThrow(new RegExp(`Missing.*${missing}`));
  });

  it("throws when a secret is set but empty", () => {
    for (const key of REQUIRED) {
      process.env[key] = "x";
    }
    process.env.STUDENT_JWT_SECRET = "   ";
    expect(() => validateRequiredEnv()).toThrow(/STUDENT_JWT_SECRET/);
  });

  const setAll = () => {
    for (const key of REQUIRED) {
      process.env[key] = "x";
    }
  };

  it("refuses to start in production when FRONTEND_URL points to localhost (regression: student invite links to localhost)", () => {
    setAll();
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "http://localhost:3000";
    expect(() => validateRequiredEnv()).toThrow(/FRONTEND_URL must use https in production/);
  });

  it("starts in production with a public https FRONTEND_URL", () => {
    setAll();
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "https://tutor.kaluger.ru";
    expect(() => validateRequiredEnv()).not.toThrow();
  });

  it("allows a localhost FRONTEND_URL outside production", () => {
    setAll();
    process.env.NODE_ENV = "development";
    process.env.FRONTEND_URL = "http://localhost:3000";
    expect(() => validateRequiredEnv()).not.toThrow();
  });
});

describe("validateDeployEnv", () => {
  const snapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...snapshot };
  });

  it("fails the deploy when the server does not run in production", () => {
    process.env.NODE_ENV = "development";
    expect(() => validateDeployEnv()).toThrow(/NODE_ENV must be "production"/);
  });
});
