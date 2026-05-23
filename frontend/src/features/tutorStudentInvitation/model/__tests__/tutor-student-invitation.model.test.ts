import { allSettled, fork } from "effector";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { studentInvitationsApi } from "@shared";

import * as model from "../tutor-student-invitation.model";

vi.mock("@shared", async () => {
  const actual =
    await vi.importActual<typeof import("@shared")>("@shared");
  return {
    ...actual,
    studentInvitationsApi: {
      ...actual.studentInvitationsApi,
      getStatus: vi.fn(),
      issueInvitation: vi.fn(),
      revoke: vi.fn(),
    },
  };
});

describe("features/tutorStudentInvitation model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads status on studentIdSet and stores it", async () => {
    vi.mocked(studentInvitationsApi.getStatus).mockResolvedValueOnce({
      status: "not_issued",
    });

    const scope = fork();
    await allSettled(model.studentIdSet, { scope, params: "student-1" });

    expect(studentInvitationsApi.getStatus).toHaveBeenCalledWith("student-1");
    expect(scope.getState(model.$status)).toEqual({ status: "not_issued" });
  });

  it("clears ephemeral URL and previous status when switching student", async () => {
    const scope = fork({
      values: [
        [model.$ephemeralInviteUrl, "https://host/student-invite/old"],
        [model.$status, { status: "pending", createdAt: "x", expiresAt: "y" }],
      ],
    });
    vi.mocked(studentInvitationsApi.getStatus).mockResolvedValueOnce({
      status: "not_issued",
    });

    await allSettled(model.studentIdSet, { scope, params: "student-2" });

    expect(scope.getState(model.$ephemeralInviteUrl)).toBeNull();
    expect(scope.getState(model.$status)).toEqual({ status: "not_issued" });
  });

  it("does not call API when studentIdSet receives null", async () => {
    const scope = fork();
    await allSettled(model.studentIdSet, { scope, params: null });
    expect(studentInvitationsApi.getStatus).not.toHaveBeenCalled();
  });

  it("stores ephemeral URL after issueInvitationFx success and refetches status", async () => {
    vi.mocked(studentInvitationsApi.issueInvitation).mockResolvedValueOnce({
      inviteUrl: "https://host/student-invite/new-raw",
      expiresAt: "2027-01-01T00:00:00.000Z",
      status: "pending",
    });
    vi.mocked(studentInvitationsApi.getStatus).mockResolvedValueOnce({
      status: "pending",
      createdAt: "2026-05-11T00:00:00.000Z",
      expiresAt: "2027-01-01T00:00:00.000Z",
    });

    const scope = fork({
      values: [[model.$studentId, "student-1"]],
    });
    await allSettled(model.issueInvitationFx, {
      scope,
      params: "student-1",
    });

    expect(scope.getState(model.$ephemeralInviteUrl)).toBe(
      "https://host/student-invite/new-raw"
    );
    expect(scope.getState(model.$status)).toMatchObject({ status: "pending" });
  });

  it("clears ephemeral URL on revoke", async () => {
    vi.mocked(studentInvitationsApi.revoke).mockResolvedValueOnce(undefined);
    vi.mocked(studentInvitationsApi.getStatus).mockResolvedValueOnce({
      status: "not_issued",
    });

    const scope = fork({
      values: [
        [model.$studentId, "student-1"],
        [model.$ephemeralInviteUrl, "https://host/student-invite/old"],
      ],
    });
    await allSettled(model.revokeInvitationFx, {
      scope,
      params: "student-1",
    });

    expect(scope.getState(model.$ephemeralInviteUrl)).toBeNull();
  });

  it("captures axios error to $error on issue failure", async () => {
    vi.mocked(studentInvitationsApi.issueInvitation).mockRejectedValueOnce({
      response: {
        data: { error: "У этого ученика уже есть аккаунт" },
      },
    });

    const scope = fork({ values: [[model.$studentId, "student-1"]] });
    await allSettled(model.issueInvitationFx, {
      scope,
      params: "student-1",
    });

    expect(scope.getState(model.$error)).toBe(
      "У этого ученика уже есть аккаунт"
    );
  });
});
