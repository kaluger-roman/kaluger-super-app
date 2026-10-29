import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import { server, takeUnhandledRequests } from "./mocks/server";

const failOnUnhandledRequests = () => {
  const requests = takeUnhandledRequests();
  if (requests.length > 0) {
    throw new Error(
      `The test sent requests no handler answered; mock the API module or add server.use(...):\n${requests.join("\n")}`
    );
  }
};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => {
  server.close();
  failOnUnhandledRequests();
});

// Test files of the "shared" project run one after another in the same worker: nothing a test
// stubs or stores may outlive it.
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  localStorage.clear();
  sessionStorage.clear();
  server.resetHandlers();
  failOnUnhandledRequests();
});
