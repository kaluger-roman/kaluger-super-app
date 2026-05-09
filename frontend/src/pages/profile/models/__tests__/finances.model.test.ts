import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { taxRatePeriodModel, userModel } from "@entities";
import { authApi, notificationsModel } from "@shared";

import { taxEnabledRequested } from "../finances.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual<typeof import("@shared")>("@shared");
  return {
    ...actual,
    authApi: { updateProfile: vi.fn() },
  };
});

const mockUser = {
  id: "1",
  email: "x@y.z",
  name: "T",
  createdAt: "2024-01-01T00:00:00Z",
  isEmailVerified: true,
  taxEnabled: false,
};

describe("finances.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks enabling without periods and shows error notification", async () => {
    const showError = vi.spyOn(notificationsModel, "showErrorEvent");
    const scope = fork({ values: [[taxRatePeriodModel.$periods, []]] });

    await allSettled(taxEnabledRequested, { scope, params: true });

    expect(authApi.updateProfile).not.toHaveBeenCalled();
    showError.mockRestore();
  });

  it("calls updateProfile when enabling with periods", async () => {
    vi.mocked(authApi.updateProfile).mockResolvedValueOnce({
      ...mockUser,
      taxEnabled: true,
    });
    const scope = fork({
      values: [
        [
          taxRatePeriodModel.$periods,
          [{ id: "p1", startDate: "2024-01-01", rate: 6 }],
        ],
      ],
    });

    await allSettled(taxEnabledRequested, { scope, params: true });

    expect(authApi.updateProfile).toHaveBeenCalledWith({ taxEnabled: true });
  });

  it("calls updateProfile when disabling regardless of periods", async () => {
    vi.mocked(authApi.updateProfile).mockResolvedValueOnce({
      ...mockUser,
      taxEnabled: false,
    });
    const scope = fork({ values: [[taxRatePeriodModel.$periods, []]] });

    await allSettled(taxEnabledRequested, { scope, params: false });

    expect(authApi.updateProfile).toHaveBeenCalledWith({ taxEnabled: false });
  });

  it("syncs $user store on success", async () => {
    vi.mocked(authApi.updateProfile).mockResolvedValueOnce({
      ...mockUser,
      taxEnabled: true,
    });
    const scope = fork({
      values: [
        [userModel.$user, mockUser],
        [
          taxRatePeriodModel.$periods,
          [{ id: "p1", startDate: "2024-01-01", rate: 6 }],
        ],
      ],
    });

    await allSettled(taxEnabledRequested, { scope, params: true });

    expect(scope.getState(userModel.$user)?.taxEnabled).toBe(true);
  });
});
