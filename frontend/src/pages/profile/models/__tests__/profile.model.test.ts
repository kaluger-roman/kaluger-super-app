import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { taxRatePeriodModel, userModel } from "@entities";
import { authApi, notificationsModel } from "@shared";

import {
  ProfilePageGate,
  $activeTab,
  $isEditMode,
  $name,
  $taxEnabled,
  $error,
  tabChanged,
  editRequested,
  editCancelled,
  nameChanged,
  taxEnabledToggled,
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
    it("initializes name and taxEnabled from current user on gate open", async () => {
      const scope = fork({
        values: [
          [userModel.$user, { ...mockUser, taxEnabled: true }],
        ],
      });

      await allSettled(ProfilePageGate.open, { scope, params: undefined });

      expect(scope.getState($name)).toBe("Test User");
      expect(scope.getState($taxEnabled)).toBe(true);
    });

    it("uses defaults when user is null", async () => {
      const scope = fork({ values: [[userModel.$user, null]] });

      await allSettled(ProfilePageGate.open, { scope, params: undefined });

      expect(scope.getState($name)).toBe("");
      expect(scope.getState($taxEnabled)).toBe(false);
    });

    it("resets state on gate close", async () => {
      const scope = fork({
        values: [
          [userModel.$user, mockUser],
          [$isEditMode, true],
          [$name, "Changed Name"],
          [$taxEnabled, true],
          [$error, "Some error"],
        ],
      });

      await allSettled(ProfilePageGate.close, { scope, params: undefined });

      expect(scope.getState($isEditMode)).toBe(false);
      expect(scope.getState($error)).toBe("");
      expect(scope.getState($name)).toBe(mockUser.name);
      expect(scope.getState($taxEnabled)).toBe(false);
    });
  });

  describe("editing mode", () => {
    it("enters edit mode on editRequested", async () => {
      const scope = fork();
      await allSettled(editRequested, { scope, params: undefined });
      expect(scope.getState($isEditMode)).toBe(true);
    });

    it("exits and resets fields on editCancelled", async () => {
      const scope = fork({
        values: [
          [userModel.$user, mockUser],
          [$isEditMode, true],
          [$name, "Changed"],
          [$taxEnabled, true],
          [$error, "X"],
        ],
      });
      await allSettled(editCancelled, { scope, params: undefined });
      expect(scope.getState($isEditMode)).toBe(false);
      expect(scope.getState($name)).toBe(mockUser.name);
      expect(scope.getState($taxEnabled)).toBe(false);
      expect(scope.getState($error)).toBe("");
    });
  });

  describe("field events", () => {
    it("nameChanged updates $name and clears error", async () => {
      const scope = fork({ values: [[$error, "X"]] });
      await allSettled(nameChanged, { scope, params: "New Name" });
      expect(scope.getState($name)).toBe("New Name");
      expect(scope.getState($error)).toBe("");
    });

    it("taxEnabledToggled updates $taxEnabled and clears error", async () => {
      const scope = fork({ values: [[$error, "X"]] });
      await allSettled(taxEnabledToggled, { scope, params: true });
      expect(scope.getState($taxEnabled)).toBe(true);
      expect(scope.getState($error)).toBe("");
    });
  });

  describe("saveRequested", () => {
    it("blocks save and shows notification when enabling tax without periods", async () => {
      const showError = vi.spyOn(notificationsModel, "showErrorEvent");
      const scope = fork({
        values: [
          [$name, "John"],
          [$taxEnabled, true],
          [taxRatePeriodModel.$periods, []],
        ],
      });
      await allSettled(saveRequested, { scope, params: undefined });
      expect(scope.getState($error)).toBe(
        "Чтобы включить учёт налога, добавьте хотя бы один период",
      );
      expect(authApi.updateProfile).not.toHaveBeenCalled();
      showError.mockRestore();
    });

    it("calls updateProfile with name + taxEnabled when valid", async () => {
      vi.mocked(authApi.updateProfile).mockResolvedValueOnce({
        ...mockUser,
        taxEnabled: true,
      });
      const scope = fork({
        values: [
          [$name, "Alice"],
          [$taxEnabled, true],
          [
            taxRatePeriodModel.$periods,
            [{ id: "p1", startDate: "2024-01-01", rate: 6 }],
          ],
        ],
      });
      await allSettled(saveRequested, { scope, params: undefined });
      expect(authApi.updateProfile).toHaveBeenCalledWith({
        name: "Alice",
        taxEnabled: true,
      });
    });

    it("exits edit mode on successful save", async () => {
      vi.mocked(authApi.updateProfile).mockResolvedValueOnce({
        ...mockUser,
      });
      const scope = fork({
        values: [
          [$name, "Alice"],
          [$taxEnabled, false],
          [$isEditMode, true],
        ],
      });
      await allSettled(updateProfileFx, {
        scope,
        params: { name: "Alice", taxEnabled: false },
      });
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

      await allSettled(tabChanged, { scope, params: "notifications" });
      expect(scope.getState($activeTab)).toBe("notifications");
    });

    it("should reset to personal tab when leaving the page", async () => {
      const scope = fork({
        values: [[$activeTab, "security"]],
      });

      await allSettled(ProfilePageGate.close, { scope, params: undefined });
      expect(scope.getState($activeTab)).toBe("personal");
    });
  });
});
