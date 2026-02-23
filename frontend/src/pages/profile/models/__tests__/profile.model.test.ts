import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { userModel } from "@entities";
import { authApi } from "@shared";

import {
  ProfilePageGate,
  $isEditMode,
  $name,
  $taxRateInput,
  $error,
  editRequested,
  editCancelled,
  nameChanged,
  taxRateInputChanged,
  saveRequested,
} from "../profile.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
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
    taxRate: 6,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ProfilePageGate", () => {
    it("should initialize name from current user on gate open", async () => {
      const scope = fork({
        values: [[userModel.$user, mockUser]],
      });

      await allSettled(ProfilePageGate.open, { scope, params: undefined });

      expect(scope.getState($name)).toBe("Test User");
    });

    it("should initialize taxRateInput from current user on gate open", async () => {
      const scope = fork({
        values: [[userModel.$user, { ...mockUser, taxRate: 13 }]],
      });

      await allSettled(ProfilePageGate.open, { scope, params: undefined });

      expect(scope.getState($taxRateInput)).toBe("13");
    });

    it("should use default taxRate 6 when user has no taxRate", async () => {
      const scope = fork({
        values: [[userModel.$user, { ...mockUser, taxRate: undefined }]],
      });

      await allSettled(ProfilePageGate.open, { scope, params: undefined });

      expect(scope.getState($taxRateInput)).toBe("6");
    });

    it("should handle null user", async () => {
      const scope = fork({
        values: [[userModel.$user, null]],
      });

      await allSettled(ProfilePageGate.open, { scope, params: undefined });

      expect(scope.getState($name)).toBe("");
    });

    it("should reset state on gate close", async () => {
      const scope = fork({
        values: [
          [userModel.$user, mockUser],
          [$isEditMode, true],
          [$name, "Changed Name"],
          [$taxRateInput, "15"],
          [$error, "Some error"],
        ],
      });

      await allSettled(ProfilePageGate.close, { scope, params: undefined });

      expect(scope.getState($isEditMode)).toBe(false);
      expect(scope.getState($error)).toBe("");
      expect(scope.getState($name)).toBe("Test User");
      expect(scope.getState($taxRateInput)).toBe("6");
    });
  });

  describe("edit mode", () => {
    it("should enter edit mode", async () => {
      const scope = fork();

      await allSettled(editRequested, { scope });

      expect(scope.getState($isEditMode)).toBe(true);
    });

    it("should exit edit mode on cancel", async () => {
      const scope = fork({
        values: [
          [userModel.$user, mockUser],
          [$isEditMode, true],
        ],
      });

      await allSettled(editCancelled, { scope });

      expect(scope.getState($isEditMode)).toBe(false);
    });

    it("should reset name to original on cancel", async () => {
      const scope = fork({
        values: [
          [userModel.$user, mockUser],
          [$isEditMode, true],
          [$name, "Changed Name"],
        ],
      });

      await allSettled(editCancelled, { scope });

      expect(scope.getState($name)).toBe("Test User");
    });

    it("should reset taxRateInput to original on cancel", async () => {
      const scope = fork({
        values: [
          [userModel.$user, mockUser],
          [$isEditMode, true],
          [$taxRateInput, "15"],
        ],
      });

      await allSettled(editCancelled, { scope });

      expect(scope.getState($taxRateInput)).toBe("6");
    });

    it("should clear error on cancel", async () => {
      const scope = fork({
        values: [
          [userModel.$user, mockUser],
          [$error, "Some error"],
        ],
      });

      await allSettled(editCancelled, { scope });

      expect(scope.getState($error)).toBe("");
    });
  });

  describe("nameChanged", () => {
    it("should update name", async () => {
      const scope = fork();

      await allSettled(nameChanged, {
        scope,
        params: "New Name",
      });

      expect(scope.getState($name)).toBe("New Name");
    });

    it("should clear error on name change", async () => {
      const scope = fork({
        values: [[$error, "Previous error"]],
      });

      await allSettled(nameChanged, {
        scope,
        params: "New Name",
      });

      expect(scope.getState($error)).toBe("");
    });
  });

  describe("taxRateInputChanged", () => {
    it("should update taxRateInput as string", async () => {
      const scope = fork();

      await allSettled(taxRateInputChanged, { scope, params: "13" });

      expect(scope.getState($taxRateInput)).toBe("13");
    });

    it("should allow empty string for free editing", async () => {
      const scope = fork();

      await allSettled(taxRateInputChanged, { scope, params: "" });

      expect(scope.getState($taxRateInput)).toBe("");
    });

    it("should clear error on taxRate change", async () => {
      const scope = fork({
        values: [[$error, "Previous error"]],
      });

      await allSettled(taxRateInputChanged, { scope, params: "13" });

      expect(scope.getState($error)).toBe("");
    });
  });

  describe("updateProfileFx", () => {
    it("should update profile successfully", async () => {
      const updatedUser = { ...mockUser, name: "Updated Name" };
      vi.mocked(authApi.updateProfile).mockResolvedValue(updatedUser);

      const scope = fork({
        values: [
          [userModel.$user, mockUser],
          [$name, "Updated Name"],
          [$taxRateInput, "6"],
          [$isEditMode, true],
        ],
      });

      await allSettled(saveRequested, { scope });

      expect(authApi.updateProfile).toHaveBeenCalledWith({
        name: "Updated Name",
        taxRate: 6,
      });
      expect(scope.getState($isEditMode)).toBe(false);
    });

    it("should parse taxRateInput to number when saving", async () => {
      const updatedUser = { ...mockUser, taxRate: 13 };
      vi.mocked(authApi.updateProfile).mockResolvedValue(updatedUser);

      const scope = fork({
        values: [
          [userModel.$user, mockUser],
          [$name, "Test User"],
          [$taxRateInput, "13"],
          [$isEditMode, true],
        ],
      });

      await allSettled(saveRequested, { scope });

      expect(authApi.updateProfile).toHaveBeenCalledWith({
        name: "Test User",
        taxRate: 13,
      });
    });

    it("should send 0 when taxRateInput is empty", async () => {
      const updatedUser = { ...mockUser, taxRate: 0 };
      vi.mocked(authApi.updateProfile).mockResolvedValue(updatedUser);

      const scope = fork({
        values: [
          [userModel.$user, mockUser],
          [$name, "Test User"],
          [$taxRateInput, ""],
          [$isEditMode, true],
        ],
      });

      await allSettled(saveRequested, { scope });

      expect(authApi.updateProfile).toHaveBeenCalledWith({
        name: "Test User",
        taxRate: 0,
      });
    });

    it("should update user in global state", async () => {
      const updatedUser = { ...mockUser, name: "Updated Name" };
      vi.mocked(authApi.updateProfile).mockResolvedValue(updatedUser);

      const scope = fork({
        values: [
          [userModel.$user, mockUser],
          [$name, "Updated Name"],
          [$taxRateInput, "6"],
        ],
      });

      await allSettled(saveRequested, { scope });

      expect(scope.getState(userModel.$user)).toEqual(updatedUser);
    });

    it("should handle update error", async () => {
      const error = new Error("Update failed");
      vi.mocked(authApi.updateProfile).mockRejectedValue(error);

      const scope = fork({
        values: [
          [userModel.$user, mockUser],
          [$name, "New Name"],
          [$taxRateInput, "6"],
          [$isEditMode, true],
        ],
      });

      await allSettled(saveRequested, { scope });

      expect(scope.getState($isEditMode)).toBe(true);
    });

    it("should handle error with message", async () => {
      const error = { message: "Custom error message" };
      vi.mocked(authApi.updateProfile).mockRejectedValue(error);

      const scope = fork({
        values: [
          [userModel.$user, mockUser],
          [$name, "New Name"],
          [$taxRateInput, "6"],
        ],
      });

      await allSettled(saveRequested, { scope });

      expect(scope.getState($isEditMode)).toBe(false);
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete edit flow", async () => {
      const updatedUser = { ...mockUser, name: "Final Name" };
      vi.mocked(authApi.updateProfile).mockResolvedValue(updatedUser);

      const scope = fork({
        values: [[userModel.$user, mockUser]],
      });

      // Open page
      await allSettled(ProfilePageGate.open, { scope, params: undefined });
      expect(scope.getState($name)).toBe("Test User");
      expect(scope.getState($taxRateInput)).toBe("6");

      // Start editing
      await allSettled(editRequested, { scope });
      expect(scope.getState($isEditMode)).toBe(true);

      // Change name
      await allSettled(nameChanged, { scope, params: "Final Name" });
      expect(scope.getState($name)).toBe("Final Name");

      // Save
      await allSettled(saveRequested, { scope });
      expect(scope.getState($isEditMode)).toBe(false);
      expect(scope.getState(userModel.$user)).toEqual(updatedUser);
    });

    it("should handle taxRate edit flow", async () => {
      const updatedUser = { ...mockUser, taxRate: 13 };
      vi.mocked(authApi.updateProfile).mockResolvedValue(updatedUser);

      const scope = fork({
        values: [[userModel.$user, mockUser]],
      });

      // Open page
      await allSettled(ProfilePageGate.open, { scope, params: undefined });
      expect(scope.getState($taxRateInput)).toBe("6");

      // Start editing
      await allSettled(editRequested, { scope });

      // Change taxRate
      await allSettled(taxRateInputChanged, { scope, params: "13" });
      expect(scope.getState($taxRateInput)).toBe("13");

      // Save
      await allSettled(saveRequested, { scope });
      expect(scope.getState($isEditMode)).toBe(false);
      expect(authApi.updateProfile).toHaveBeenCalledWith({
        name: "Test User",
        taxRate: 13,
      });
    });

    it("should handle cancel after changes", async () => {
      const scope = fork({
        values: [[userModel.$user, mockUser]],
      });

      // Open page
      await allSettled(ProfilePageGate.open, { scope, params: undefined });

      // Start editing
      await allSettled(editRequested, { scope });

      // Change name and taxRate
      await allSettled(nameChanged, { scope, params: "Changed" });
      await allSettled(taxRateInputChanged, { scope, params: "15" });
      expect(scope.getState($name)).toBe("Changed");
      expect(scope.getState($taxRateInput)).toBe("15");

      // Cancel
      await allSettled(editCancelled, { scope });
      expect(scope.getState($isEditMode)).toBe(false);
      expect(scope.getState($name)).toBe("Test User");
      expect(scope.getState($taxRateInput)).toBe("6");
    });
  });
});
