/* eslint-disable import/order */
import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { allSettled, fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect, vi } from "vitest";

import { theme } from "@shared";

import { appInitModel } from "../../../model";
import { InstallPrompt } from "../InstallPrompt";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return { ...actual };
});

const renderWithProviders = (ui: React.ReactElement, scope: ReturnType<typeof fork>) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </EffectorProvider>
  );

describe("InstallPrompt", () => {
  it("should render nothing when no prompt available and not iOS", () => {
    const scope = fork({
      values: [
        [appInitModel.$showInstallBanner, false],
        [appInitModel.$installPrompt, null],
        [appInitModel.$showIosInstallHint, false],
      ],
    });

    const { container } = renderWithProviders(<InstallPrompt />, scope);
    expect(container.innerHTML).toBe("");
  });

  it("should show Chrome install banner when beforeinstallprompt fires", () => {
    const mockPrompt = { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: "accepted" as const }) };

    const scope = fork({
      values: [
        [appInitModel.$showInstallBanner, true],
        [appInitModel.$installPrompt, mockPrompt],
        [appInitModel.$showIosInstallHint, false],
      ],
    });

    renderWithProviders(<InstallPrompt />, scope);

    expect(screen.getByText(/Установите приложение для быстрого доступа/)).toBeInTheDocument();
    expect(screen.getByText("Установить")).toBeInTheDocument();
  });

  it("should show iOS install hint", () => {
    const scope = fork({
      values: [
        [appInitModel.$showInstallBanner, false],
        [appInitModel.$installPrompt, null],
        [appInitModel.$showIosInstallHint, true],
      ],
    });

    renderWithProviders(<InstallPrompt />, scope);

    expect(screen.getByText(/Установите приложение для push-уведомлений/)).toBeInTheDocument();
    expect(screen.getByText(/На экран Домой/)).toBeInTheDocument();
  });

  it("should dismiss iOS hint on close", async () => {
    const user = userEvent.setup();

    const scope = fork({
      values: [
        [appInitModel.$showInstallBanner, false],
        [appInitModel.$installPrompt, null],
        [appInitModel.$showIosInstallHint, true],
      ],
    });

    renderWithProviders(<InstallPrompt />, scope);

    const closeButton = screen.getByRole("button");
    await user.click(closeButton);

    expect(scope.getState(appInitModel.$showIosInstallHint)).toBe(false);
  });

  it("should dismiss Chrome banner on close", async () => {
    const user = userEvent.setup();
    const mockPrompt = { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: "accepted" as const }) };

    const scope = fork({
      values: [
        [appInitModel.$showInstallBanner, true],
        [appInitModel.$installPrompt, mockPrompt],
        [appInitModel.$showIosInstallHint, false],
      ],
    });

    renderWithProviders(<InstallPrompt />, scope);

    const buttons = screen.getAllByRole("button");
    // Close button is the last one (after "Установить")
    await user.click(buttons[buttons.length - 1]);

    expect(scope.getState(appInitModel.$showInstallBanner)).toBe(false);
  });

  it("should update $showIosInstallHint on iosInstallHintDismissed", async () => {
    const scope = fork({
      values: [[appInitModel.$showIosInstallHint, true]],
    });

    await allSettled(appInitModel.iosInstallHintDismissed, { scope });
    expect(scope.getState(appInitModel.$showIosInstallHint)).toBe(false);
  });
});
