/* eslint-disable testing-library/no-node-access */
import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork, allSettled } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { notificationsModel } from "../../../model";
import { theme } from "../../themeConfig";
import { NotificationProvider } from "../NotificationProvider";

const renderWithProviders = (ui: React.ReactElement, scope: ReturnType<typeof fork>) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </EffectorProvider>
  );

describe("NotificationProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("Rendering", () => {
    it("should not render when notification is null", () => {
      const scope = fork();

      const { container } = renderWithProviders(<NotificationProvider />, scope);

      expect(container).toBeEmptyDOMElement();
    });

    it("should render snackbar when notification exists", async () => {
      const scope = fork();

      renderWithProviders(<NotificationProvider />, scope);

      await allSettled(notificationsModel.showNotification, {
        scope,
        params: { message: "Test notification", type: "success" },
      });

      expect(screen.getByText("Test notification")).toBeInTheDocument();
    });

    it("should render success notification with correct severity", async () => {
      const scope = fork();

      renderWithProviders(<NotificationProvider />, scope);

      await allSettled(notificationsModel.showSuccessEvent, {
        scope,
        params: "Success message",
      });

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("MuiAlert-filledSuccess");
      expect(screen.getByText("Success message")).toBeInTheDocument();
    });

    it("should render error notification with correct severity", async () => {
      const scope = fork();

      renderWithProviders(<NotificationProvider />, scope);

      await allSettled(notificationsModel.showErrorEvent, {
        scope,
        params: "Error message",
      });

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("MuiAlert-filledError");
      expect(screen.getByText("Error message")).toBeInTheDocument();
    });

    it("should render warning notification with correct severity", async () => {
      const scope = fork();

      renderWithProviders(<NotificationProvider />, scope);

      await allSettled(notificationsModel.showWarningEvent, {
        scope,
        params: "Warning message",
      });

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("MuiAlert-filledWarning");
      expect(screen.getByText("Warning message")).toBeInTheDocument();
    });

    it("should render info notification with correct severity", async () => {
      const scope = fork();

      renderWithProviders(<NotificationProvider />, scope);

      await allSettled(notificationsModel.showInfoEvent, {
        scope,
        params: "Info message",
      });

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("MuiAlert-filledInfo");
      expect(screen.getByText("Info message")).toBeInTheDocument();
    });
  });

  describe("Close button behavior", () => {
    it("should render close button when notification exists", async () => {
      const scope = fork();

      renderWithProviders(<NotificationProvider />, scope);

      await allSettled(notificationsModel.showSuccessEvent, {
        scope,
        params: "Test message",
      });

      expect(screen.getByText("Test message")).toBeInTheDocument();

      const closeButton = screen.getByRole("button", { name: /close/i });
      expect(closeButton).toBeInTheDocument();
    });

    it("should hide notification when hideNotification event is triggered", async () => {
      const scope = fork();

      renderWithProviders(<NotificationProvider />, scope);

      await allSettled(notificationsModel.showErrorEvent, {
        scope,
        params: "Error to hide",
      });

      expect(screen.getByText("Error to hide")).toBeInTheDocument();

      await allSettled(notificationsModel.hideNotification, { scope });

      expect(scope.getState(notificationsModel.$notification)).toBeNull();
    });
  });

  describe("Auto-hide duration", () => {
    it("should set 8000ms duration for error notifications", async () => {
      const scope = fork();

      renderWithProviders(<NotificationProvider />, scope);

      await allSettled(notificationsModel.showErrorEvent, {
        scope,
        params: "Error message",
      });

      expect(screen.getByText("Error message")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should set 4000ms duration for success notifications", async () => {
      const scope = fork();

      renderWithProviders(<NotificationProvider />, scope);

      await allSettled(notificationsModel.showSuccessEvent, {
        scope,
        params: "Success message",
      });

      expect(screen.getByText("Success message")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should set 4000ms duration for warning notifications", async () => {
      const scope = fork();

      renderWithProviders(<NotificationProvider />, scope);

      await allSettled(notificationsModel.showWarningEvent, {
        scope,
        params: "Warning message",
      });

      expect(screen.getByText("Warning message")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should set 4000ms duration for info notifications", async () => {
      const scope = fork();

      renderWithProviders(<NotificationProvider />, scope);

      await allSettled(notificationsModel.showInfoEvent, {
        scope,
        params: "Info message",
      });

      expect(screen.getByText("Info message")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("Multiple notifications", () => {
    it("should replace previous notification with new one", async () => {
      const scope = fork();

      renderWithProviders(<NotificationProvider />, scope);

      await allSettled(notificationsModel.showSuccessEvent, {
        scope,
        params: "First message",
      });

      expect(screen.getByText("First message")).toBeInTheDocument();

      await allSettled(notificationsModel.showErrorEvent, {
        scope,
        params: "Second message",
      });

      expect(screen.queryByText("First message")).not.toBeInTheDocument();
      expect(screen.getByText("Second message")).toBeInTheDocument();
    });

    it("should update notification type when replaced", async () => {
      const scope = fork();

      renderWithProviders(<NotificationProvider />, scope);

      await allSettled(notificationsModel.showSuccessEvent, {
        scope,
        params: "Success message",
      });

      let alert = screen.getByRole("alert");
      expect(alert).toHaveClass("MuiAlert-filledSuccess");

      await allSettled(notificationsModel.showErrorEvent, {
        scope,
        params: "Error message",
      });

      alert = screen.getByRole("alert");
      expect(alert).toHaveClass("MuiAlert-filledError");
      expect(screen.getByText("Error message")).toBeInTheDocument();
    });
  });

  describe("Positioning", () => {
    it("should render snackbar with top-right position", async () => {
      const scope = fork();

      const { baseElement } = renderWithProviders(<NotificationProvider />, scope);

      await allSettled(notificationsModel.showSuccessEvent, {
        scope,
        params: "Positioned message",
      });

      const snackbar = baseElement.querySelector(".MuiSnackbar-root");
      expect(snackbar).toHaveClass("MuiSnackbar-anchorOriginTopRight");
    });
  });
});
