import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { allSettled, fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect } from "vitest";

import { adminAlertsModel } from "@features/admin";
import type { AdminAlert } from "@shared";
import { formatDateTimeFull, theme } from "@shared";

import { makeAlert, READ_AT, RESOLVED } from "../../../../../__tests__/adminAlerts.fixtures";
import { AlertCard } from "../AlertCard";

const renderCard = (alert: AdminAlert) => {
  const readIds: string[] = [];
  const scope = fork({
    values: [[adminAlertsModel.$alerts, [alert]]],
    handlers: [
      [
        adminAlertsModel.markAlertReadFx,
        (id: string) => {
          readIds.push(id);
          return Promise.resolve([{ ...alert, readAt: READ_AT }]);
        },
      ],
    ],
  });
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <AlertCard alert={alert} />
      </ThemeProvider>
    </EffectorProvider>
  );
  return { scope, readIds };
};

const card = (alert: AdminAlert) => screen.getByText(alert.title).closest("[data-muted]");

describe("AlertCard", () => {
  it("should show an unread active alert highlighted with the read button", () => {
    const alert = makeAlert();
    renderCard(alert);

    expect(card(alert)).toHaveAttribute("data-muted", "false");
    expect(screen.getByText("Критично")).toBeInTheDocument();
    expect(screen.getByText(alert.description)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Прочитано: ${alert.title}` })).toBeInTheDocument();
    expect(screen.queryByText("Решено")).not.toBeInTheDocument();
  });

  it("should show the times in the browser time zone", () => {
    const openedAt = "2026-10-20T03:00:00.000Z";
    const lastSeenAt = "2026-10-20T22:15:00.000Z";
    renderCard(makeAlert({ openedAt, lastSeenAt }));

    expect(screen.getByText(`Началось: ${formatDateTimeFull(openedAt)}`)).toBeInTheDocument();
    expect(
      screen.getByText(`Последний раз: ${formatDateTimeFull(lastSeenAt)}`)
    ).toBeInTheDocument();
  });

  it("should count repeats when the problem was seen more than once", () => {
    const lastSeenAt = "2026-10-20T09:00:00.000Z";
    renderCard(makeAlert({ occurrences: 2, lastSeenAt }));

    expect(
      screen.getByText(`Последний раз: ${formatDateTimeFull(lastSeenAt)}, повторялось 2 раза`)
    ).toBeInTheDocument();
  });

  it("should mute a read active alert and hide the read button", () => {
    const alert = makeAlert({ severity: "warning", readAt: READ_AT });
    renderCard(alert);

    expect(card(alert)).toHaveAttribute("data-muted", "true");
    expect(screen.getByText("Предупреждение")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Прочитано: / })).not.toBeInTheDocument();
  });

  it("should mute a resolved alert and show when it was closed", () => {
    const alert = makeAlert({ ...RESOLVED });
    renderCard(alert);

    expect(card(alert)).toHaveAttribute("data-muted", "true");
    expect(screen.getByText("Решено")).toBeInTheDocument();
    expect(
      screen.getByText(`Закрыт: ${formatDateTimeFull(RESOLVED.resolvedAt)}`)
    ).toBeInTheDocument();
    expect(screen.getByText("Письмо о решении отправлено")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Прочитано: / })).not.toBeInTheDocument();
  });

  it("should send the alert id when it is marked as read", async () => {
    const alert = makeAlert({ id: "clx-42" });
    const { scope, readIds } = renderCard(alert);

    await userEvent.click(screen.getByRole("button", { name: /^Прочитано: / }));
    await allSettled(scope);

    expect(readIds).toEqual(["clx-42"]);
    expect(scope.getState(adminAlertsModel.$alerts)).toEqual([{ ...alert, readAt: READ_AT }]);
  });
});
