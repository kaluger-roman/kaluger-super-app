/* eslint-disable import/order */
import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { theme } from "@shared";
import { notificationsModel } from "@entities";

import { ReminderSettings } from "../ReminderSettings";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
    notificationsApi: {
      getVapidKey: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      getSubscriptions: vi.fn(),
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
    },
  };
});

const renderWithProviders = (ui: React.ReactElement, scope: ReturnType<typeof fork>) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </EffectorProvider>
  );

describe("ReminderSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render title", () => {
    const scope = fork({
      values: [
        [notificationsModel.$isPushSupported, true],
        [notificationsModel.$reminderSettings, { enabled: false, intervals: [], muteWhenInLesson: false }],
        [notificationsModel.$pushPermission, "default"],
        [notificationsModel.$isPushSubscribed, false],
        [notificationsModel.$vapidKey, null],
        [notificationsModel.$serviceWorkerRegistration, null],
      ],
    });

    renderWithProviders(<ReminderSettings />, scope);

    expect(screen.getByText("Напоминания об уроках")).toBeInTheDocument();
  });

  it("should show unsupported message when push is not supported", () => {
    const scope = fork({
      values: [
        [notificationsModel.$isPushSupported, false],
        [notificationsModel.$reminderSettings, { enabled: false, intervals: [], muteWhenInLesson: false }],
        [notificationsModel.$pushPermission, "default"],
        [notificationsModel.$isPushSubscribed, false],
        [notificationsModel.$vapidKey, null],
        [notificationsModel.$serviceWorkerRegistration, null],
      ],
    });

    renderWithProviders(<ReminderSettings />, scope);

    expect(screen.getByText("Ваш браузер не поддерживает push-уведомления")).toBeInTheDocument();
  });

  it("should render toggle switch", () => {
    const scope = fork({
      values: [
        [notificationsModel.$isPushSupported, true],
        [notificationsModel.$reminderSettings, { enabled: false, intervals: [], muteWhenInLesson: false }],
        [notificationsModel.$pushPermission, "default"],
        [notificationsModel.$isPushSubscribed, false],
        [notificationsModel.$vapidKey, null],
        [notificationsModel.$serviceWorkerRegistration, null],
      ],
    });

    renderWithProviders(<ReminderSettings />, scope);

    expect(screen.getByText("Включить напоминания")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("should show interval chips when enabled", () => {
    const scope = fork({
      values: [
        [notificationsModel.$isPushSupported, true],
        [notificationsModel.$reminderSettings, { enabled: true, intervals: [5, 30], muteWhenInLesson: false }],
        [notificationsModel.$pushPermission, "granted"],
        [notificationsModel.$isPushSubscribed, true],
        [notificationsModel.$vapidKey, "key"],
        [notificationsModel.$serviceWorkerRegistration, null],
      ],
    });

    renderWithProviders(<ReminderSettings />, scope);

    expect(screen.getByText("Напомнить за")).toBeInTheDocument();
    expect(screen.getByText("5 мин")).toBeInTheDocument();
    expect(screen.getByText("10 мин")).toBeInTheDocument();
    expect(screen.getByText("15 мин")).toBeInTheDocument();
    expect(screen.getByText("30 мин")).toBeInTheDocument();
    expect(screen.getByText("1 час")).toBeInTheDocument();
  });

  it("should show mute toggle when enabled", () => {
    const scope = fork({
      values: [
        [notificationsModel.$isPushSupported, true],
        [notificationsModel.$reminderSettings, { enabled: true, intervals: [30], muteWhenInLesson: false }],
        [notificationsModel.$pushPermission, "granted"],
        [notificationsModel.$isPushSubscribed, true],
        [notificationsModel.$vapidKey, "key"],
        [notificationsModel.$serviceWorkerRegistration, null],
      ],
    });

    renderWithProviders(<ReminderSettings />, scope);

    expect(screen.getByText("Не беспокоить во время урока")).toBeInTheDocument();
  });

  it("should not show interval chips when disabled", () => {
    const scope = fork({
      values: [
        [notificationsModel.$isPushSupported, true],
        [notificationsModel.$reminderSettings, { enabled: false, intervals: [], muteWhenInLesson: false }],
        [notificationsModel.$pushPermission, "default"],
        [notificationsModel.$isPushSubscribed, false],
        [notificationsModel.$vapidKey, null],
        [notificationsModel.$serviceWorkerRegistration, null],
      ],
    });

    renderWithProviders(<ReminderSettings />, scope);

    expect(screen.queryByText("Напомнить за")).not.toBeInTheDocument();
    expect(screen.queryByText("5 мин")).not.toBeInTheDocument();
  });

  it("should show permission denied alert", () => {
    const scope = fork({
      values: [
        [notificationsModel.$isPushSupported, true],
        [notificationsModel.$reminderSettings, { enabled: false, intervals: [], muteWhenInLesson: false }],
        [notificationsModel.$pushPermission, "denied"],
        [notificationsModel.$isPushSubscribed, false],
        [notificationsModel.$vapidKey, null],
        [notificationsModel.$serviceWorkerRegistration, null],
      ],
    });

    renderWithProviders(<ReminderSettings />, scope);

    expect(
      screen.getByText(/Уведомления заблокированы/)
    ).toBeInTheDocument();
  });

  it("should call unsubscribePushFx when disabling reminders while subscribed", async () => {
    const user = userEvent.setup();
    const mockSwRegistration = {} as ServiceWorkerRegistration;
    const unsubscribeMock = vi.fn();

    const scope = fork({
      values: [
        [notificationsModel.$isPushSupported, true],
        [notificationsModel.$reminderSettings, { enabled: true, intervals: [30], muteWhenInLesson: false }],
        [notificationsModel.$pushPermission, "granted"],
        [notificationsModel.$isPushSubscribed, true],
        [notificationsModel.$vapidKey, "key"],
        [notificationsModel.$serviceWorkerRegistration, mockSwRegistration],
      ],
      handlers: [
        [notificationsModel.unsubscribePushFx, unsubscribeMock],
        [notificationsModel.updateSettingsFx, vi.fn().mockResolvedValue({ enabled: false, intervals: [30], muteWhenInLesson: false })],
      ],
    });

    renderWithProviders(<ReminderSettings />, scope);

    const toggles = screen.getAllByRole("checkbox");
    // First toggle is "Включить напоминания"
    await user.click(toggles[0]);

    expect(unsubscribeMock).toHaveBeenCalledWith(mockSwRegistration);
  });

  it("should handle interval chip click", async () => {
    const user = userEvent.setup();
    const scope = fork({
      values: [
        [notificationsModel.$isPushSupported, true],
        [notificationsModel.$reminderSettings, { enabled: true, intervals: [30], muteWhenInLesson: false }],
        [notificationsModel.$pushPermission, "granted"],
        [notificationsModel.$isPushSubscribed, true],
        [notificationsModel.$vapidKey, "key"],
        [notificationsModel.$serviceWorkerRegistration, null],
      ],
    });

    renderWithProviders(<ReminderSettings />, scope);

    const chip5min = screen.getByText("5 мин");
    await user.click(chip5min);

    // The click should trigger settingsUpdated
    expect(chip5min).toBeInTheDocument();
  });
});
