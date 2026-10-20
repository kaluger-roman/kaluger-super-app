import { ThemeProvider } from "@mui/material";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { callHistoryModel, getCallHistory } from "@entities";
import type { CallHistoryPrincipal } from "@entities";
import { theme } from "@shared";

import { CallHistoryPage } from "../CallHistoryPage";

vi.mock("@entities/callRecord/api", () => ({
  getCallHistory: vi.fn(async () => []),
}));

const renderPage = (records: unknown, principal: CallHistoryPrincipal = "tutor"): void => {
  const scope = fork({
    values: [[callHistoryModel.$callHistory, records]],
  });
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <CallHistoryPage principal={principal} />
      </ThemeProvider>
    </EffectorProvider>
  );
};

describe("CallHistoryPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should render the page heading", () => {
    renderPage([]);
    expect(screen.getByText("История звонков")).toBeInTheDocument();
  });

  it("should render a row for each call record", () => {
    renderPage([
      {
        id: "1",
        peerName: "Иван Смирнов",
        direction: "outgoing",
        startedAt: "2026-06-03T14:32:00.000Z",
        durationSeconds: 1845,
        status: "completed",
      },
    ]);
    expect(screen.getByText("Иван Смирнов")).toBeInTheDocument();
  });

  it("should load the history of the principal given by the route", async () => {
    renderPage([], "student");
    await screen.findByText("История звонков");
    expect(getCallHistory).toHaveBeenCalledWith("student");
  });

  it("should show a load error with a retry instead of the empty state", async () => {
    vi.mocked(getCallHistory).mockRejectedValueOnce(new Error("network"));
    renderPage([], "tutor");

    expect(await screen.findByText("Не удалось загрузить историю звонков")).toBeInTheDocument();
    expect(screen.queryByText("Звонков пока нет")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Повторить" }));

    expect(getCallHistory).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Звонков пока нет")).toBeInTheDocument();
  });

  it("should keep the error and disable retry while the retry is loading", async () => {
    vi.mocked(getCallHistory).mockRejectedValueOnce(new Error("network"));
    vi.mocked(getCallHistory).mockReturnValueOnce(new Promise(() => undefined));
    renderPage([], "tutor");
    await screen.findByText("Не удалось загрузить историю звонков");

    await userEvent.click(screen.getByRole("button", { name: "Повторить" }));

    expect(screen.getByText("Не удалось загрузить историю звонков")).toBeInTheDocument();
    expect(screen.queryByText("Звонков пока нет")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Повторить" })).toBeDisabled();
  });

  it("should not show the empty state during the first load", async () => {
    vi.mocked(getCallHistory).mockReturnValueOnce(new Promise(() => undefined));
    renderPage([], "tutor");

    await waitFor(() => expect(getCallHistory).toHaveBeenCalled());
    expect(screen.queryByText("Звонков пока нет")).not.toBeInTheDocument();
  });
});
