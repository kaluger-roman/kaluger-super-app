import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { userModel } from "@entities";

import * as logoutConfirmationModel from "../logoutConfirmation.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
    navigate: vi.fn(),
  };
});

const mockUser = {
  id: "1",
  email: "test@example.com",
  name: "Test User",
  createdAt: "2024-01-01T00:00:00Z",
  isEmailVerified: true,
  taxRate: 6,
};

describe("features/logoutConfirmation/logoutConfirmation.model", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should open dialog on logoutRequested", async () => {
    const scope = fork();

    await allSettled(logoutConfirmationModel.logoutRequested, { scope });

    expect(scope.getState(logoutConfirmationModel.$isDialogOpen)).toBe(true);
  });

  it("should close dialog and NOT logout on logoutCancelled", async () => {
    const scope = fork({
      values: [
        [logoutConfirmationModel.$isDialogOpen, true],
        [userModel.$user, mockUser],
      ],
    });

    await allSettled(logoutConfirmationModel.logoutCancelled, { scope });

    expect(scope.getState(logoutConfirmationModel.$isDialogOpen)).toBe(false);
    expect(scope.getState(userModel.$user)).toEqual(mockUser);
  });

  it("should close dialog and dispatch logoutUser on logoutConfirmed", async () => {
    const scope = fork({
      values: [
        [logoutConfirmationModel.$isDialogOpen, true],
        [userModel.$user, mockUser],
      ],
    });

    await allSettled(logoutConfirmationModel.logoutConfirmed, { scope });

    expect(scope.getState(logoutConfirmationModel.$isDialogOpen)).toBe(false);
    expect(scope.getState(userModel.$user)).toBeNull();
  });
});
