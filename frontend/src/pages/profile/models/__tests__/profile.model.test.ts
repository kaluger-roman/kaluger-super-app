import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { userModel } from "@entities";
import { authApi } from "@shared";

import {
  ProfilePageGate,
  $isEditMode,
  $name,
  $error,
  editRequested,
  editCancelled,
  nameChanged,
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
          [$error, "Some error"],
        ],
      });

      await allSettled(ProfilePageGate.close, { scope, params: undefined });

      expect(scope.getState($isEditMode)).toBe(false);
      expect(scope.getState($error)).toBe("");
      expect(scope.getState($name)).toBe("Test User");
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

  describe("updateProfileFx", () => {
    it("should update profile successfully", async () => {
      const updatedUser = { ...mockUser, name: "Updated Name" };
      vi.mocked(authApi.updateProfile).mockResolvedValue(updatedUser);

      const scope = fork({
        values: [
          [userModel.$user, mockUser],
          [$name, "Updated Name"],
          [$isEditMode, true],
        ],
      });

      await allSettled(saveRequested, { scope });

      expect(authApi.updateProfile).toHaveBeenCalledWith({ name: "Updated Name" });
      expect(scope.getState($isEditMode)).toBe(false);
    });

    it("should update user in global state", async () => {
      const updatedUser = { ...mockUser, name: "Updated Name" };
      vi.mocked(authApi.updateProfile).mockResolvedValue(updatedUser);

      const scope = fork({
        values: [
          [userModel.$user, mockUser],
          [$name, "Updated Name"],
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
        ],
      });

      await allSettled(saveRequested, { scope });

      // Error is handled by showing notification
      // Edit mode is not explicitly changed on error, so it stays false
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

    it("should handle cancel after changes", async () => {
      const scope = fork({
        values: [[userModel.$user, mockUser]],
      });

      // Open page
      await allSettled(ProfilePageGate.open, { scope, params: undefined });

      // Start editing
      await allSettled(editRequested, { scope });

      // Change name
      await allSettled(nameChanged, { scope, params: "Changed" });
      expect(scope.getState($name)).toBe("Changed");

      // Cancel
      await allSettled(editCancelled, { scope });
      expect(scope.getState($isEditMode)).toBe(false);
      expect(scope.getState($name)).toBe("Test User");
    });
  });
});
