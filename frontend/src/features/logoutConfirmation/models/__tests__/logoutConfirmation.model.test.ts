import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { userModel } from "@entities";

import {
  $isDialogOpen,
  logoutCancelled,
  logoutConfirmed,
  logoutRequested,
} from "../logoutConfirmation.model";

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

    await allSettled(logoutRequested, { scope });

    expect(scope.getState($isDialogOpen)).toBe(true);
  });

  it("should close dialog and NOT logout on logoutCancelled", async () => {
    const scope = fork({
      values: [
        [$isDialogOpen, true],
        [userModel.$user, mockUser],
      ],
    });

    await allSettled(logoutCancelled, { scope });

    expect(scope.getState($isDialogOpen)).toBe(false);
    expect(scope.getState(userModel.$user)).toEqual(mockUser);
  });

  it("should close dialog and dispatch logoutUser on logoutConfirmed", async () => {
    const scope = fork({
      values: [
        [$isDialogOpen, true],
        [userModel.$user, mockUser],
      ],
    });

    await allSettled(logoutConfirmed, { scope });

    expect(scope.getState($isDialogOpen)).toBe(false);
    expect(scope.getState(userModel.$user)).toBeNull();
  });
});
