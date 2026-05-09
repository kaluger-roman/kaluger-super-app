import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { userModel } from "@entities";
import { authApi } from "@shared";

import {
  ProfilePageGate,
  $activeTab,
  $isEditMode,
  $name,
  tabChanged,
  editRequested,
  editCancelled,
  nameChanged,
  saveRequested,
  updateProfileFx,
} from "../profile.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual<typeof import("@shared")>("@shared");
  return {
    ...actual,
    authApi: {
      updateProfile: vi.fn(),
    },
  };
});

describe("profile.model", () => {
  const mockUser = {
    id: "1",
    email: "test@example.com",
    name: "Test User",
    createdAt: "2024-01-01T00:00:00Z",
    isEmailVerified: true,
    taxEnabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ProfilePageGate", () => {
    it("initializes name from current user on gate open", async () => {
      const scope = fork({ values: [[userModel.$user, mockUser]] });

      await allSettled(ProfilePageGate.open, { scope, params: undefined });

      expect(scope.getState($name)).toBe("Test User");
    });

    it("uses defaults when user is null", async () => {
      const scope = fork({ values: [[userModel.$user, null]] });

      await allSettled(ProfilePageGate.open, { scope, params: undefined });

      expect(scope.getState($name)).toBe("");
    });

    it("resets state on gate close", async () => {
      const scope = fork({
        values: [
          [userModel.$user, mockUser],
          [$isEditMode, true],
          [$name, "Changed Name"],
        ],
      });

      await allSettled(ProfilePageGate.close, { scope, params: undefined });

      expect(scope.getState($isEditMode)).toBe(false);
      expect(scope.getState($name)).toBe(mockUser.name);
    });
  });

  describe("editing mode", () => {
    it("enters edit mode on editRequested", async () => {
      const scope = fork();
      await allSettled(editRequested, { scope, params: undefined });
      expect(scope.getState($isEditMode)).toBe(true);
    });

    it("exits and resets name on editCancelled", async () => {
      const scope = fork({
        values: [
          [userModel.$user, mockUser],
          [$isEditMode, true],
          [$name, "Changed"],
        ],
      });
      await allSettled(editCancelled, { scope, params: undefined });
      expect(scope.getState($isEditMode)).toBe(false);
      expect(scope.getState($name)).toBe(mockUser.name);
    });
  });

  describe("field events", () => {
    it("nameChanged updates $name", async () => {
      const scope = fork();
      await allSettled(nameChanged, { scope, params: "New Name" });
      expect(scope.getState($name)).toBe("New Name");
    });
  });

  describe("saveRequested", () => {
    it("calls updateProfile with name only", async () => {
      vi.mocked(authApi.updateProfile).mockResolvedValueOnce(mockUser);
      const scope = fork({ values: [[$name, "Alice"]] });
      await allSettled(saveRequested, { scope, params: undefined });
      expect(authApi.updateProfile).toHaveBeenCalledWith({ name: "Alice" });
    });

    it("exits edit mode on successful save", async () => {
      vi.mocked(authApi.updateProfile).mockResolvedValueOnce(mockUser);
      const scope = fork({
        values: [
          [$name, "Alice"],
          [$isEditMode, true],
        ],
      });
      await allSettled(updateProfileFx, { scope, params: { name: "Alice" } });
      expect(scope.getState($isEditMode)).toBe(false);
    });
  });

  describe("tabs", () => {
    it("should default to personal tab", () => {
      const scope = fork();
      expect(scope.getState($activeTab)).toBe("personal");
    });

    it("should change active tab on tabChanged", async () => {
      const scope = fork();

      await allSettled(tabChanged, { scope, params: "security" });
      expect(scope.getState($activeTab)).toBe("security");

      await allSettled(tabChanged, { scope, params: "finances" });
      expect(scope.getState($activeTab)).toBe("finances");

      await allSettled(tabChanged, { scope, params: "notifications" });
      expect(scope.getState($activeTab)).toBe("notifications");
    });

    it("should reset to personal tab when leaving the page", async () => {
      const scope = fork({ values: [[$activeTab, "security"]] });

      await allSettled(ProfilePageGate.close, { scope, params: undefined });
      expect(scope.getState($activeTab)).toBe("personal");
    });
  });
});
