/* eslint-disable import/order */
import { ThemeProvider } from "@mui/material";
import { render, screen, waitFor } from "@testing-library/react";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { studentInvitationsApi, theme } from "@shared";

import { InvitationManager } from "../InvitationManager";

vi.mock("@shared", async () => {
  const actual = await vi.importActual<typeof import("@shared")>("@shared");
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

const renderWithScope = (
  scope: ReturnType<typeof fork>,
  props: { studentId: string; studentArchived?: boolean }
) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <InvitationManager {...props} />
      </ThemeProvider>
    </EffectorProvider>
  );

describe("InvitationManager — archived student", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disables 'Создать ссылку-приглашение' and shows warning when student is archived (not_issued)", async () => {
    vi.mocked(studentInvitationsApi.getStatus).mockResolvedValue({
      status: "not_issued",
    });

    const scope = fork();
    renderWithScope(scope, { studentId: "stud-1", studentArchived: true });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Создать ссылку-приглашение" })
      ).toBeDisabled();
    });

    expect(
      screen.getByText(
        "Архивированному ученику нельзя выдать приглашение — снимите архивацию."
      )
    ).toBeInTheDocument();
  });

  it("keeps 'Создать ссылку-приглашение' enabled when student is not archived", async () => {
    vi.mocked(studentInvitationsApi.getStatus).mockResolvedValue({
      status: "not_issued",
    });

    const scope = fork();
    renderWithScope(scope, { studentId: "stud-2", studentArchived: false });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Создать ссылку-приглашение" })
      ).toBeEnabled();
    });

    expect(
      screen.queryByText(/Архивированному ученику нельзя/i)
    ).not.toBeInTheDocument();
  });

  it("disables 'Создать новую (отозвать текущую)' on pending+archived but keeps 'Отозвать' enabled", async () => {
    vi.mocked(studentInvitationsApi.getStatus).mockResolvedValue({
      status: "pending",
      createdAt: "2026-05-23T10:00:00.000Z",
      expiresAt: "2027-05-23T10:00:00.000Z",
    });

    const scope = fork();
    renderWithScope(scope, { studentId: "stud-3", studentArchived: true });

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Создать новую (отозвать текущую)",
        })
      ).toBeDisabled();
    });

    expect(screen.getByRole("button", { name: "Отозвать" })).toBeEnabled();
    expect(
      screen.getByText(/Ученик в архиве — новую ссылку выдать нельзя/i)
    ).toBeInTheDocument();
  });
});
