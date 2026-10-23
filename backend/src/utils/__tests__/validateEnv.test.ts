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
});

describe("validateDeployEnv", () => {
  const snapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...snapshot };
  });

  const setAll = () => {
    for (const key of [
      "DATABASE_URL",
      "JWT_SECRET",
      "ADMIN_JWT_SECRET",
      "STUDENT_JWT_SECRET",
      "RESEND_API_KEY",
      "EMAIL_FROM",
      "VAPID_PUBLIC_KEY",
      "VAPID_PRIVATE_KEY",
      "VAPID_SUBJECT",
    ]) {
      process.env[key] = "x";
    }
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "https://tutor.kaluger.ru";
  };

  it("passes a production config with a public https FRONTEND_URL", () => {
    setAll();
    expect(() => validateDeployEnv()).not.toThrow();
  });

  it("fails the deploy when FRONTEND_URL points to localhost (regression: student invite links to localhost)", () => {
    setAll();
    process.env.FRONTEND_URL = "http://localhost:3000";
    expect(() => validateDeployEnv()).toThrow(/FRONTEND_URL must use https on the server/);
  });

  it("fails the deploy when a required variable is missing", () => {
    setAll();
    delete process.env.JWT_SECRET;
    expect(() => validateDeployEnv()).toThrow(/Missing.*JWT_SECRET/);
  });

  it("starts the app itself with a localhost FRONTEND_URL in production (the QA stack does)", () => {
    setAll();
    process.env.FRONTEND_URL = "http://localhost";
    expect(() => validateRequiredEnv()).not.toThrow();
  });

  it("fails the deploy when the server does not run in production", () => {
    process.env.NODE_ENV = "development";
    expect(() => validateDeployEnv()).toThrow(/NODE_ENV must be "production"/);
  });
});
