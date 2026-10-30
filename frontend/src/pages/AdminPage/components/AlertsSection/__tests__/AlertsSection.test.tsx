import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { allSettled, fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect } from "vitest";

import { adminAlertsModel } from "@features/admin";
import type { AdminAlert } from "@shared";
import { theme } from "@shared";

import { makeAlert, READ_AT, RESOLVED } from "../../../__tests__/adminAlerts.fixtures";
import { AlertsSection } from "../AlertsSection";

const unread = makeAlert({ id: "a1", title: "Бэкап не создан" });
const read = makeAlert({
  id: "a2",
  severity: "warning",
  title: "Резервное хранилище давно не обновлялось",
  readAt: READ_AT,
});
const resolved = makeAlert({ id: "r1", title: "Мало места на диске сервера", ...RESOLVED });

const EMPTY_TEXT = "Всё в порядке, активных алертов нет";
const HISTORY_TITLE = "Закрытые за последние 90 дней";

const markAllRead = (alerts: AdminAlert[]) =>
  alerts.map((alert) => (alert.resolvedAt ? alert : { ...alert, readAt: alert.readAt ?? READ_AT }));

const renderSection = (alerts: AdminAlert[]) => {
  const readAllCalls: AdminAlert[][] = [];
  const scope = fork({
    values: [[adminAlertsModel.$alerts, alerts]],
    handlers: [
      [
        adminAlertsModel.markAllAlertsReadFx,
        () => {
          readAllCalls.push(alerts);
          return Promise.resolve(markAllRead(alerts));
        },
      ],
    ],
  });
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <AlertsSection />
      </ThemeProvider>
    </EffectorProvider>
  );
  return { scope, readAllCalls };
};

const readAllButton = () => screen.getByRole("button", { name: "Отметить все прочитанными" });

describe("AlertsSection", () => {
  it("should show the empty state when nothing is active", () => {
    renderSection([resolved]);

    expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(resolved.title)).not.toBeInTheDocument();
    expect(readAllButton()).toBeDisabled();
  });

  it("should list only active alerts under the «Активные» filter", () => {
    renderSection([unread, read, resolved]);

    expect(screen.getByText(unread.title)).toBeInTheDocument();
    expect(screen.getByText(read.title)).toBeInTheDocument();
    expect(screen.queryByText(HISTORY_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
  });

  it("should show the closed alerts of the last 90 days under «Все»", async () => {
    const { scope } = renderSection([unread, resolved]);

    await userEvent.click(screen.getByRole("button", { name: "Все" }));

    expect(scope.getState(adminAlertsModel.$alertsFilter)).toBe("all");
    expect(screen.getByText(HISTORY_TITLE)).toBeInTheDocument();
    expect(screen.getByText(resolved.title)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Активные" }));

    expect(screen.queryByText(resolved.title)).not.toBeInTheDocument();
  });

  it("should keep the filter when the selected option is clicked again", async () => {
    const { scope } = renderSection([unread]);

    await userEvent.click(screen.getByRole("button", { name: "Активные" }));

    expect(scope.getState(adminAlertsModel.$alertsFilter)).toBe("active");
  });

  it("should disable read-all when every active alert is read", () => {
    renderSection([read, resolved]);

    expect(readAllButton()).toBeDisabled();
  });

  it("should mark all alerts as read and show the returned list", async () => {
    const { scope, readAllCalls } = renderSection([unread, read]);
    expect(screen.getByRole("button", { name: /^Прочитано: / })).toBeInTheDocument();

    await userEvent.click(readAllButton());
    await allSettled(scope);

    expect(readAllCalls).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /^Прочитано: / })).not.toBeInTheDocument();
    expect(readAllButton()).toBeDisabled();
  });
});
