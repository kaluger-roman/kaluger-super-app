import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "../../../__tests__/mocks/server";
import { api } from "../base";

const TOKEN_KEY = "authToken";
const TEST_URL = "*/api/test";

// The tests go through the app's own instance and answer it over MSW: its adapter, the modules
// and window.localStorage stay as they are for the next file of the shared project.
const answerWith = (status: number, body: Record<string, unknown>) =>
  server.use(http.get(TEST_URL, () => HttpResponse.json(body, { status })));

const recordAuthorization = () => {
  const seen: (string | null)[] = [];
  server.use(
    http.get(TEST_URL, ({ request }) => {
      seen.push(request.headers.get("Authorization"));
      return HttpResponse.json({});
    })
  );
  return seen;
};

// A 401 sends the tab to the login page through window.location.
const openPage = (pathname: string) => {
  const page = { pathname, href: `http://localhost:3000${pathname}` };
  vi.stubGlobal("location", page);
  return page;
};

const requestTest = () => api.get("/test").catch((error: unknown) => error);

describe("api axios instance", () => {
  it("should create axios instance with correct baseURL", () => {
    expect(api.defaults.baseURL).toBe("http://localhost:3001/api");
  });

  it("should create axios instance with Content-Type header", () => {
    expect(api.defaults.headers["Content-Type"]).toBe("application/json");
  });

  describe("request interceptor", () => {
    it("should add Authorization header when token is present", async () => {
      localStorage.setItem(TOKEN_KEY, "test-token-123");
      const seen = recordAuthorization();

      await api.get("/test");

      expect(seen).toEqual(["Bearer test-token-123"]);
    });

    it("should not add Authorization header when token is absent", async () => {
      const seen = recordAuthorization();

      await api.get("/test");

      expect(seen).toEqual([null]);
    });
  });

  describe("response interceptor", () => {
    it("should pass through successful response", async () => {
      answerWith(200, { message: "success" });

      const response = await api.get("/test");

      expect(response.data.message).toBe("success");
    });

    it("should remove authToken from localStorage on 401 error", async () => {
      localStorage.setItem(TOKEN_KEY, "test-token");
      openPage("/students");
      answerWith(401, { message: "Unauthorized" });

      await requestTest();

      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it("should redirect to /login on 401 error when not on login page", async () => {
      const page = openPage("/students");
      answerWith(401, { message: "Unauthorized" });

      await requestTest();

      expect(page.href).toBe("/login");
    });

    it.each(["/login", "/register", "/admin"])(
      "should not redirect to /login on 401 error when already on %s",
      async (pathname) => {
        const page = openPage(pathname);
        answerWith(401, { message: "Unauthorized" });

        await requestTest();

        expect(page.href).toBe(`http://localhost:3000${pathname}`);
      }
    );

    it("should reject promise with error on 401", async () => {
      openPage("/students");
      answerWith(401, { message: "Unauthorized" });

      await expect(api.get("/test")).rejects.toMatchObject({
        response: { status: 401, data: { message: "Unauthorized" } },
      });
    });

    it("should reject promise with error on non-401 errors", async () => {
      answerWith(500, { message: "Internal Server Error" });

      await expect(api.get("/test")).rejects.toMatchObject({
        response: { status: 500, data: { message: "Internal Server Error" } },
      });
    });

    it("should not remove token on non-401 errors", async () => {
      localStorage.setItem(TOKEN_KEY, "test-token");
      answerWith(500, { message: "Internal Server Error" });

      await requestTest();

      expect(localStorage.getItem(TOKEN_KEY)).toBe("test-token");
    });

    it("should not redirect on non-401 errors", async () => {
      const page = openPage("/students");
      answerWith(404, { message: "Not Found" });

      await requestTest();

      expect(page.href).toBe("http://localhost:3000/students");
    });

    it("should handle errors without response object", async () => {
      localStorage.setItem(TOKEN_KEY, "test-token");
      server.use(http.get(TEST_URL, () => HttpResponse.error()));

      await expect(api.get("/test")).rejects.toMatchObject({ message: "Network Error" });
      expect(localStorage.getItem(TOKEN_KEY)).toBe("test-token");
    });
  });
});
