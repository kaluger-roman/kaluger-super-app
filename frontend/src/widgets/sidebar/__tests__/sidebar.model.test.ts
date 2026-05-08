import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { userModel } from "@entities";

import { $isSidebarOpen, sidebarToggled, sidebarClosed } from "../sidebar.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
    navigate: vi.fn(),
  };
});

describe("widgets/sidebar/sidebar.model", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should toggle sidebar open/closed", async () => {
    const scope = fork();

    await allSettled(sidebarToggled, { scope });
    expect(scope.getState($isSidebarOpen)).toBe(true);

    await allSettled(sidebarToggled, { scope });
    expect(scope.getState($isSidebarOpen)).toBe(false);
  });

  it("should close sidebar on sidebarClosed", async () => {
    const scope = fork({ values: [[$isSidebarOpen, true]] });

    await allSettled(sidebarClosed, { scope });

    expect(scope.getState($isSidebarOpen)).toBe(false);
  });

  // Regression: opened sidebar persisted across logout/login because state
  // lived in Effector and logout did SPA navigation, not a hard reload.
  it("should close sidebar on logout", async () => {
    const scope = fork({ values: [[$isSidebarOpen, true]] });

    await allSettled(userModel.logoutUser, { scope });

    expect(scope.getState($isSidebarOpen)).toBe(false);
  });
});
