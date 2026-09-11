import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { theme } from "@shared";

import { InvitationActions } from "../InvitationActions";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const baseProps = {
  studentArchived: false,
  isIssuing: false,
  isRevoking: false,
  onIssue: vi.fn(),
  onRevoke: vi.fn(),
};

describe("InvitationActions", () => {
  it("should call onIssue and onRevoke from the two buttons", async () => {
    const user = userEvent.setup();
    const onIssue = vi.fn();
    const onRevoke = vi.fn();
    renderWithTheme(
      <InvitationActions
        {...baseProps}
        issueVariant="outlined"
        onIssue={onIssue}
        onRevoke={onRevoke}
      />
    );

    await user.click(screen.getByRole("button", { name: "Создать новую (отозвать текущую)" }));
    await user.click(screen.getByRole("button", { name: "Отозвать" }));

    expect(onIssue).toHaveBeenCalledTimes(1);
    expect(onRevoke).toHaveBeenCalledTimes(1);
  });

  it("should disable issue button and show warning when student is archived", () => {
    renderWithTheme(
      <InvitationActions {...baseProps} issueVariant="contained" studentArchived={true} />
    );

    expect(screen.getByRole("button", { name: "Создать новую (отозвать текущую)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Отозвать" })).toBeEnabled();
    expect(screen.getByText(/Ученик в архиве — новую ссылку выдать нельзя/)).toBeInTheDocument();
  });

  it("should not show archived warning for an active student", () => {
    renderWithTheme(<InvitationActions {...baseProps} issueVariant="outlined" />);

    expect(screen.queryByText(/Ученик в архиве/)).not.toBeInTheDocument();
  });

  it("should disable buttons while issuing or revoking", () => {
    renderWithTheme(
      <InvitationActions
        {...baseProps}
        issueVariant="outlined"
        isIssuing={true}
        isRevoking={true}
      />
    );

    expect(screen.getByRole("button", { name: "Создать новую (отозвать текущую)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Отозвать" })).toBeDisabled();
  });

  it("should render issue button with the requested variant", () => {
    const { rerender } = renderWithTheme(
      <InvitationActions {...baseProps} issueVariant="outlined" />
    );
    expect(screen.getByRole("button", { name: "Создать новую (отозвать текущую)" })).toHaveClass(
      "MuiButton-outlined"
    );

    rerender(
      <ThemeProvider theme={theme}>
        <InvitationActions {...baseProps} issueVariant="contained" />
      </ThemeProvider>
    );
    expect(screen.getByRole("button", { name: "Создать новую (отозвать текущую)" })).toHaveClass(
      "MuiButton-contained"
    );
  });
});
