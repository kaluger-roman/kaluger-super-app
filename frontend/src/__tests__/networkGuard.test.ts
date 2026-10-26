import axios from "axios";
import { http, HttpResponse } from "msw";
import { describe, it, expect } from "vitest";

import { server, takeUnhandledRequests } from "./mocks/server";

describe("network guard", () => {
  it("should answer an unhandled axios request with a network error and record it", async () => {
    await expect(axios.get("http://localhost:3001/api/lessons")).rejects.toThrow("Network Error");

    // Taken here so that setup.ts does not fail this test for it.
    expect(takeUnhandledRequests()).toEqual(["GET http://localhost:3001/api/lessons"]);
  });

  it("should record an unhandled fetch request", async () => {
    await expect(
      fetch("http://localhost:3001/api/students/1/archive", { method: "PUT" })
    ).rejects.toThrow();

    expect(takeUnhandledRequests()).toEqual(["PUT http://localhost:3001/api/students/1/archive"]);
  });

  it("should let a test handler answer the request", async () => {
    server.use(http.get("*/api/news/has-unread", () => HttpResponse.json({ hasUnread: true })));

    const response = await axios.get("http://localhost:3001/api/news/has-unread");

    expect(response.data).toEqual({ hasUnread: true });
    expect(takeUnhandledRequests()).toEqual([]);
  });

  it("should drop the test handlers after each test", async () => {
    await expect(axios.get("http://localhost:3001/api/news/has-unread")).rejects.toThrow();

    expect(takeUnhandledRequests()).toEqual(["GET http://localhost:3001/api/news/has-unread"]);
  });
});
