import { act, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { notificationsModel } from "@shared";

import { App } from "../App";

vi.mock("@shared/lib/platform.helpers", () => ({
  isIos: vi.fn(() => true),
  isInStandaloneMode: vi.fn(() => true),
}));

describe("App", () => {
  afterEach(() => {
    act(() => {
      notificationsModel.hideNotification();
    });
  });

  it("should render toasts outside the pull-to-refresh wrapper so the call screen cannot cover them", async () => {
    render(<App />);
    const wrapper = await screen.findByTestId("pull-to-refresh");

    act(() => {
      notificationsModel.showErrorEvent("Собеседник уже демонстрирует экран");
    });

    expect(await screen.findByText("Собеседник уже демонстрирует экран")).toBeInTheDocument();
    expect(
      within(wrapper).queryByText("Собеседник уже демонстрирует экран")
    ).not.toBeInTheDocument();
  });
});
