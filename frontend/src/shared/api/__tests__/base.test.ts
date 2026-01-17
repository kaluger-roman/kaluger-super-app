import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("api axios instance", () => {
  let localStorageMock: Record<string, string>;
  let originalLocation: Location;

  beforeEach(() => {
    // Reset modules to get fresh axios instance
    vi.resetModules();

    // Mock localStorage
    localStorageMock = {};
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn((key: string) => localStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageMock[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageMock[key];
        }),
        clear: vi.fn(() => {
          localStorageMock = {};
        }),
      },
      writable: true,
    });

    // Mock window.location
    originalLocation = window.location;
    delete (window as { location?: Location }).location;
    (window as { location: Location }).location = {
      ...originalLocation,
      href: "",
      pathname: "/",
    } as Location;
  });

  afterEach(() => {
    (window as { location: Location }).location = originalLocation;
    vi.clearAllMocks();
  });

  it("should create axios instance with correct baseURL", async () => {
    const { api } = await import("../base");
    expect(api.defaults.baseURL).toBe("http://localhost:3001/api");
  });

  it("should create axios instance with Content-Type header", async () => {
    const { api } = await import("../base");
    expect(api.defaults.headers["Content-Type"]).toBe("application/json");
  });

  describe("request interceptor", () => {
    it("should add Authorization header when token is present", async () => {
      localStorageMock["authToken"] = "test-token-123";
      const { api } = await import("../base");

      // Mock the adapter to capture the config
      const mockAdapter = vi.fn().mockResolvedValue({ data: {}, status: 200 });
      api.defaults.adapter = mockAdapter;

      await api.get("/test");

      const capturedConfig = mockAdapter.mock.calls[0][0] as InternalAxiosRequestConfig;
      expect(capturedConfig.headers.Authorization).toBe("Bearer test-token-123");
    });

    it("should not add Authorization header when token is absent", async () => {
      const { api } = await import("../base");

      // Mock the adapter to capture the config
      const mockAdapter = vi.fn().mockResolvedValue({ data: {}, status: 200 });
      api.defaults.adapter = mockAdapter;

      await api.get("/test");

      const capturedConfig = mockAdapter.mock.calls[0][0] as InternalAxiosRequestConfig;
      expect(capturedConfig.headers.Authorization).toBeUndefined();
    });
  });

  describe("response interceptor", () => {
    it("should pass through successful response", async () => {
      const { api } = await import("../base");

      const mockAdapter = vi.fn().mockResolvedValue({
        data: { message: "success" },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      });
      api.defaults.adapter = mockAdapter;

      const response = await api.get("/test");

      expect(response.data.message).toBe("success");
    });

    it("should remove authToken from localStorage on 401 error", async () => {
      localStorageMock["authToken"] = "test-token";
      const { api } = await import("../base");

      const mockAdapter = vi.fn().mockRejectedValue({
        response: {
          status: 401,
          data: { message: "Unauthorized" },
        },
        isAxiosError: true,
      } as AxiosError);
      api.defaults.adapter = mockAdapter;

      try {
        await api.get("/test");
      } catch {
        // Expected to throw
      }

      expect(window.localStorage.removeItem).toHaveBeenCalledWith("authToken");
    });

    it("should redirect to /login on 401 error when not on login page", async () => {
      window.location.pathname = "/students";
      const { api } = await import("../base");

      const mockAdapter = vi.fn().mockRejectedValue({
        response: {
          status: 401,
          data: { message: "Unauthorized" },
        },
        isAxiosError: true,
      } as AxiosError);
      api.defaults.adapter = mockAdapter;

      try {
        await api.get("/test");
      } catch {
        // Expected to throw
      }

      expect(window.location.href).toBe("/login");
    });

    it("should not redirect to /login on 401 error when already on /login", async () => {
      window.location.pathname = "/login";
      const { api } = await import("../base");

      const mockAdapter = vi.fn().mockRejectedValue({
        response: {
          status: 401,
          data: { message: "Unauthorized" },
        },
        isAxiosError: true,
      } as AxiosError);
      api.defaults.adapter = mockAdapter;

      try {
        await api.get("/test");
      } catch {
        // Expected to throw
      }

      expect(window.location.href).toBe("");
    });

    it("should not redirect to /login on 401 error when already on /register", async () => {
      window.location.pathname = "/register";
      const { api } = await import("../base");

      const mockAdapter = vi.fn().mockRejectedValue({
        response: {
          status: 401,
          data: { message: "Unauthorized" },
        },
        isAxiosError: true,
      } as AxiosError);
      api.defaults.adapter = mockAdapter;

      try {
        await api.get("/test");
      } catch {
        // Expected to throw
      }

      expect(window.location.href).toBe("");
    });

    it("should reject promise with error on 401", async () => {
      const { api } = await import("../base");

      const error = {
        response: {
          status: 401,
          data: { message: "Unauthorized" },
        },
        isAxiosError: true,
      } as AxiosError;

      const mockAdapter = vi.fn().mockRejectedValue(error);
      api.defaults.adapter = mockAdapter;

      await expect(api.get("/test")).rejects.toMatchObject({
        response: {
          status: 401,
          data: { message: "Unauthorized" },
        },
      });
    });

    it("should reject promise with error on non-401 errors", async () => {
      const { api } = await import("../base");

      const error = {
        response: {
          status: 500,
          data: { message: "Internal Server Error" },
        },
        isAxiosError: true,
      } as AxiosError;

      const mockAdapter = vi.fn().mockRejectedValue(error);
      api.defaults.adapter = mockAdapter;

      await expect(api.get("/test")).rejects.toMatchObject({
        response: {
          status: 500,
          data: { message: "Internal Server Error" },
        },
      });
    });

    it("should not remove token on non-401 errors", async () => {
      localStorageMock["authToken"] = "test-token";
      const { api } = await import("../base");

      const mockAdapter = vi.fn().mockRejectedValue({
        response: {
          status: 500,
          data: { message: "Internal Server Error" },
        },
        isAxiosError: true,
      } as AxiosError);
      api.defaults.adapter = mockAdapter;

      try {
        await api.get("/test");
      } catch {
        // Expected to throw
      }

      expect(window.localStorage.removeItem).not.toHaveBeenCalled();
    });

    it("should not redirect on non-401 errors", async () => {
      window.location.pathname = "/students";
      const { api } = await import("../base");

      const mockAdapter = vi.fn().mockRejectedValue({
        response: {
          status: 404,
          data: { message: "Not Found" },
        },
        isAxiosError: true,
      } as AxiosError);
      api.defaults.adapter = mockAdapter;

      try {
        await api.get("/test");
      } catch {
        // Expected to throw
      }

      expect(window.location.href).toBe("");
    });

    it("should handle errors without response object", async () => {
      const { api } = await import("../base");

      const error = {
        message: "Network Error",
        isAxiosError: true,
      } as AxiosError;

      const mockAdapter = vi.fn().mockRejectedValue(error);
      api.defaults.adapter = mockAdapter;

      await expect(api.get("/test")).rejects.toMatchObject({
        message: "Network Error",
      });
    });
  });
});
