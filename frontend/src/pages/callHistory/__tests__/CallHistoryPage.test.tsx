import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { callHistoryModel } from "@entities";
import { theme } from "@shared";

import { CallHistoryPage } from "../CallHistoryPage";

vi.mock("@entities/callRecord/api/callHistoryApi", () => ({
  getCallHistory: vi.fn(async () => []),
}));

const renderPage = (records: unknown): void => {
  const scope = fork({
    values: [[callHistoryModel.$callHistory, records]],
  });
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <CallHistoryPage />
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
});
