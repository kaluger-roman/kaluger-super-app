import { ThemeProvider } from "@mui/material";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CallHistoryPrincipal, CallHistoryRecord } from "@entities";
import { getCallHistory } from "@entities/callRecord/api";
import { theme } from "@shared";

import { CallHistoryPage } from "../CallHistoryPage";

vi.mock("@entities/callRecord/api", () => ({
  getCallHistory: vi.fn(),
}));

const mockedGetCallHistory = vi.mocked(getCallHistory);

const record: CallHistoryRecord = {
  id: "1",
  peerName: "Иван Смирнов",
  direction: "outgoing",
  startedAt: "2026-06-03T14:32:00.000Z",
  durationSeconds: 1845,
  status: "COMPLETED",
  lesson: null,
};

const renderPage = (principal: CallHistoryPrincipal = "tutor"): void => {
  render(
    <EffectorProvider value={fork()}>
      <ThemeProvider theme={theme}>
        <CallHistoryPage principal={principal} />
      </ThemeProvider>
    </EffectorProvider>
  );
};

describe("CallHistoryPage", () => {
  beforeEach(() => {
    mockedGetCallHistory.mockReset();
    mockedGetCallHistory.mockResolvedValue([]);
  });

  it("should render the page heading", () => {
    renderPage();
    expect(screen.getByText("История звонков")).toBeInTheDocument();
  });

  it("should render a row for each loaded call record", async () => {
    mockedGetCallHistory.mockResolvedValueOnce([record]);
    renderPage();
    const row = await screen.findByRole("listitem");
    expect(row).toHaveTextContent("Иван Смирнов");
    expect(row).toHaveTextContent("Завершён");
  });

  it("should load the history of the principal given by the route", async () => {
    renderPage("student");
    await waitFor(() => expect(mockedGetCallHistory).toHaveBeenCalledWith("student"));
  });

  it("should show a load error with a retry instead of the empty state", async () => {
    mockedGetCallHistory.mockRejectedValueOnce(new Error("network"));
    renderPage();

    expect(await screen.findByText("Не удалось загрузить историю звонков")).toBeInTheDocument();
    expect(screen.queryByText("Звонков пока нет")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Повторить" }));

    expect(mockedGetCallHistory).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Звонков пока нет")).toBeInTheDocument();
  });

  it("should keep the error and disable retry while the retry is loading", async () => {
    mockedGetCallHistory
      .mockRejectedValueOnce(new Error("network"))
      .mockReturnValueOnce(new Promise(() => undefined));
    renderPage();
    await screen.findByText("Не удалось загрузить историю звонков");

    await userEvent.click(screen.getByRole("button", { name: "Повторить" }));

    expect(screen.getByText("Не удалось загрузить историю звонков")).toBeInTheDocument();
    expect(screen.queryByText("Звонков пока нет")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Повторить" })).toBeDisabled();
  });

  it("should not show the empty state during the first load", async () => {
    mockedGetCallHistory.mockReturnValueOnce(new Promise(() => undefined));
    renderPage();

    await waitFor(() => expect(mockedGetCallHistory).toHaveBeenCalled());
    expect(screen.queryByText("Звонков пока нет")).not.toBeInTheDocument();
  });
});
