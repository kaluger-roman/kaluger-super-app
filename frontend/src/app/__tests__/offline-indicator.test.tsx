/* eslint-disable import/order */
import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { allSettled, fork } from "effector";
import { Provider as EffectorProvider, useUnit } from "effector-react";
import { describe, it, expect, vi } from "vitest";

import { theme } from "@shared";

import { appInitModel } from "../model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
  };
});

// Simple OfflineIndicator component extracted for testing
const OfflineTestComponent = () => {
  const isOnline = useUnit(appInitModel.$isOnline);

  if (isOnline) return null;

  return <div role="alert">Нет подключения к интернету. Данные могут быть неактуальны</div>;
};

const renderWithProviders = (ui: React.ReactElement, scope: ReturnType<typeof fork>) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </EffectorProvider>
  );

describe("offline indicator", () => {
  it("should show message when offline", () => {
    const scope = fork({
      values: [[appInitModel.$isOnline, false]],
    });

    renderWithProviders(<OfflineTestComponent />, scope);

    expect(
      screen.getByText("Нет подключения к интернету. Данные могут быть неактуальны")
    ).toBeInTheDocument();
  });

  it("should not show message when online", () => {
    const scope = fork({
      values: [[appInitModel.$isOnline, true]],
    });

    renderWithProviders(<OfflineTestComponent />, scope);

    expect(
      screen.queryByText("Нет подключения к интернету. Данные могут быть неактуальны")
    ).not.toBeInTheDocument();
  });

  it("should update $isOnline store on onlineStatusChanged event", async () => {
    const scope = fork({
      values: [[appInitModel.$isOnline, true]],
    });

    // Go offline
    await allSettled(appInitModel.onlineStatusChanged, { scope, params: false });
    expect(scope.getState(appInitModel.$isOnline)).toBe(false);

    // Go online
    await allSettled(appInitModel.onlineStatusChanged, { scope, params: true });
    expect(scope.getState(appInitModel.$isOnline)).toBe(true);
  });
});
