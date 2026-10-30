import { findPublicUrlProblem, getFrontendUrl, isPublicProductionServer } from "../frontendUrl";

describe("getFrontendUrl", () => {
  const snapshot = process.env.FRONTEND_URL;

  afterEach(() => {
    process.env.FRONTEND_URL = snapshot;
  });

  it("returns FRONTEND_URL without a trailing slash", () => {
    process.env.FRONTEND_URL = "https://tutor.kaluger.ru/";
    expect(getFrontendUrl()).toBe("https://tutor.kaluger.ru");
  });

  it("throws when FRONTEND_URL is not set", () => {
    delete process.env.FRONTEND_URL;
    expect(() => getFrontendUrl()).toThrow(/FRONTEND_URL is not set/);
  });
});

describe("findPublicUrlProblem", () => {
  it("accepts a public https address", () => {
    expect(findPublicUrlProblem("https://tutor.kaluger.ru")).toBeNull();
  });

  it.each([
    ["http://localhost:3000", "must use https"],
    ["https://localhost:3000", "points to the local machine"],
    ["https://127.0.0.1", "points to the local machine"],
    ["https://[::1]:3000", "points to the local machine"],
    ["tutor.kaluger.ru", "is not an absolute URL"],
  ])("rejects %s", (url, problem) => {
    expect(findPublicUrlProblem(url)).toBe(problem);
  });
});

describe("isPublicProductionServer", () => {
  const snapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...snapshot };
  });

  it("is true in production with a public FRONTEND_URL", () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "https://tutor.kaluger.ru";
    expect(isPublicProductionServer()).toBe(true);
  });

  it("is false in production on localhost (the QA stack)", () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "http://localhost:3000";
    expect(isPublicProductionServer()).toBe(false);
  });

  it("is false outside production", () => {
    process.env.NODE_ENV = "development";
    process.env.FRONTEND_URL = "https://tutor.kaluger.ru";
    expect(isPublicProductionServer()).toBe(false);
  });
});
