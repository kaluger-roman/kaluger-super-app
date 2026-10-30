import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect } from "vitest";

import { adminAlertsModel } from "@features/admin";
import type { AdminAlert } from "@shared";
import { theme } from "@shared";

import { makeAlert, READ_AT, RESOLVED } from "../../../__tests__/adminAlerts.fixtures";
import { AlertsTabLabel } from "../AlertsTabLabel";

const renderLabel = (alerts: AdminAlert[]) =>
  render(
    <EffectorProvider value={fork({ values: [[adminAlertsModel.$alerts, alerts]] })}>
      <ThemeProvider theme={theme}>
        <AlertsTabLabel />
      </ThemeProvider>
    </EffectorProvider>
  );

describe("AlertsTabLabel", () => {
  it("should count only unread active alerts", () => {
    renderLabel([
      makeAlert({ id: "a1" }),
      makeAlert({ id: "a2", severity: "warning" }),
      makeAlert({ id: "a3", readAt: READ_AT }),
      makeAlert({ id: "r1", ...RESOLVED }),
    ]);

    const counter = screen.getByLabelText("Непрочитанных алертов: 2");
    expect(counter).toHaveTextContent("2");
    expect(screen.getByText("Алерты")).toBeInTheDocument();
  });

  it("should hide the counter when nothing is unread", () => {
    renderLabel([makeAlert({ readAt: READ_AT }), makeAlert({ id: "r1", ...RESOLVED })]);

    expect(screen.getByText("Алерты")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Непрочитанных алертов/)).not.toBeInTheDocument();
  });
});
