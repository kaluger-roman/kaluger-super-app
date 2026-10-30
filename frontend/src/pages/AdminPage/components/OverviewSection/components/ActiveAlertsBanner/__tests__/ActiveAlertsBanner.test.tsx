import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect } from "vitest";

import { ADMIN_TAB, adminAlertsModel, adminAuthModel, adminDataModel } from "@features/admin";
import type { AdminAlert } from "@shared";
import { theme } from "@shared";

import { makeAlert, READ_AT, RESOLVED } from "../../../../../__tests__/adminAlerts.fixtures";
import { ActiveAlertsBanner } from "../ActiveAlertsBanner";

const renderBanner = (alerts: AdminAlert[]) => {
  const scope = fork({
    values: [
      [adminAuthModel.$adminToken, null],
      [adminAlertsModel.$alerts, alerts],
    ],
  });
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <ActiveAlertsBanner />
      </ThemeProvider>
    </EffectorProvider>
  );
  return { scope };
};

describe("ActiveAlertsBanner", () => {
  it("should count every active alert, read ones included", () => {
    renderBanner([
      makeAlert({ id: "a1", severity: "warning" }),
      makeAlert({ id: "a2", severity: "warning", readAt: READ_AT }),
      makeAlert({ id: "r1", ...RESOLVED }),
    ]);

    expect(screen.getByRole("alert")).toHaveTextContent("Есть активные проблемы: 2");
  });

  it("should be an error when a critical alert is active", () => {
    renderBanner([makeAlert({ severity: "warning" }), makeAlert({ id: "a2", readAt: READ_AT })]);

    expect(screen.getByRole("alert")).toHaveClass("MuiAlert-colorError");
  });

  it("should be a warning when only warnings are active", () => {
    renderBanner([makeAlert({ severity: "warning" }), makeAlert({ id: "r1", ...RESOLVED })]);

    expect(screen.getByRole("alert")).toHaveClass("MuiAlert-colorWarning");
  });

  it("should be hidden when nothing is active", () => {
    renderBanner([makeAlert({ id: "r1", ...RESOLVED })]);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should open the alerts tab", async () => {
    const { scope } = renderBanner([makeAlert()]);

    await userEvent.click(screen.getByRole("button", { name: "Открыть алерты" }));

    expect(scope.getState(adminDataModel.$tabIndex)).toBe(ADMIN_TAB.alerts);
  });
});
