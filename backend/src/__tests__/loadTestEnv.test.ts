const SHELL_DB = "postgresql://shell@localhost:5432/shell_db";
const ENV_FILE_DB = "postgresql://file@localhost:5432/tutor_test";
const BRANCH_DB = "postgresql://dev:dev@localhost:15433/tutor_app_test";

// Loads loadTestEnv as if backend/.env.test existed and set DATABASE_URL with `override`.
const loadWithEnvFile = () => {
  jest.isolateModules(() => {
    jest.doMock("fs", () => ({ ...jest.requireActual("fs"), existsSync: () => true }));
    jest.doMock("dotenv", () => ({
      config: jest.fn(() => {
        process.env.DATABASE_URL = ENV_FILE_DB;
      }),
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("./loadTestEnv");
  });
};

describe("loadTestEnv", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalTestDatabaseUrl = process.env.TEST_DATABASE_URL;

  const restore = (name: string, value: string | undefined) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };

  beforeEach(() => {
    process.env.DATABASE_URL = SHELL_DB;
    delete process.env.TEST_DATABASE_URL;
  });

  afterEach(() => {
    restore("DATABASE_URL", originalDatabaseUrl);
    restore("TEST_DATABASE_URL", originalTestDatabaseUrl);
  });

  it("should take DATABASE_URL from .env.test over the shell", () => {
    loadWithEnvFile();

    expect(process.env.DATABASE_URL).toBe(ENV_FILE_DB);
  });

  it("should keep the branch database from TEST_DATABASE_URL when .env.test exists", () => {
    process.env.TEST_DATABASE_URL = BRANCH_DB;

    loadWithEnvFile();

    expect(process.env.DATABASE_URL).toBe(BRANCH_DB);
  });
});
