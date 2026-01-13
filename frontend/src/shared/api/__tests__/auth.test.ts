import { describe, it, expect, vi, beforeEach } from "vitest";

import { authApi } from "../auth";
import { api } from "../base";

vi.mock("../base", () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe("authApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("login", () => {
    it("should login with credentials", async () => {
      const credentials = { email: "test@example.com", password: "password123" };
      const mockResponse = {
        data: { token: "token123", user: { id: "1", email: credentials.email } },
      };

      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await authApi.login(credentials);

      expect(api.post).toHaveBeenCalledWith("/auth/login", credentials);
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle login error", async () => {
      const credentials = { email: "test@example.com", password: "wrong" };
      const error = new Error("Invalid credentials");

      vi.mocked(api.post).mockRejectedValue(error);

      await expect(authApi.login(credentials)).rejects.toThrow("Invalid credentials");
    });
  });

  describe("register", () => {
    it("should register new user", async () => {
      const userData = {
        email: "new@example.com",
        password: "password123",
        name: "New User",
      };
      const mockResponse = {
        data: { token: "token123", user: { id: "1", ...userData } },
      };

      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await authApi.register(userData);

      expect(api.post).toHaveBeenCalledWith("/auth/register", userData);
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle registration error", async () => {
      const userData = {
        email: "existing@example.com",
        password: "password123",
        name: "User",
      };
      const error = new Error("Email already exists");

      vi.mocked(api.post).mockRejectedValue(error);

      await expect(authApi.register(userData)).rejects.toThrow("Email already exists");
    });
  });

  describe("getProfile", () => {
    it("should get user profile", async () => {
      const mockUser = { id: "1", email: "test@example.com", name: "Test User" };
      const mockResponse = { data: { user: mockUser } };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await authApi.getProfile();

      expect(api.get).toHaveBeenCalledWith("/auth/profile");
      expect(result).toEqual(mockUser);
    });

    it("should handle profile fetch error", async () => {
      const error = new Error("Unauthorized");

      vi.mocked(api.get).mockRejectedValue(error);

      await expect(authApi.getProfile()).rejects.toThrow("Unauthorized");
    });
  });
});
