import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, expect, it } from "vitest";

import { callHistoryModel } from "@entities";
import type { CallHistoryRecord } from "@entities";
import { theme } from "@shared";

import { CallHistoryList } from "../CallHistoryList";

const base: CallHistoryRecord = {
  id: "r-1",
  peerName: "Иван Петров",
  direction: "outgoing",
  startedAt: "2026-10-22T15:01:00",
  durationSeconds: 3524,
  status: "COMPLETED",
  lesson: null,
};

const renderList = (records: CallHistoryRecord[]) =>
  render(
    <EffectorProvider value={fork({ values: [[callHistoryModel.$callHistory, records]] })}>
      <ThemeProvider theme={theme}>
        <CallHistoryList />
      </ThemeProvider>
    </EffectorProvider>
  );

describe("CallHistoryList", () => {
  it("should show the lesson of a lesson call", () => {
    renderList([
      {
        ...base,
        lesson: {
          id: "l-1",
          subject: "PHYSICS",
          startTime: "2026-10-22T15:00:00",
          endTime: "2026-10-22T16:00:00",
        },
      },
    ]);

    expect(screen.getByRole("listitem")).toHaveTextContent(
      "Урок: Физика · четверг, 22 октября · 15:00—16:00"
    );
  });

  it("should not show a lesson line for a call without a lesson", () => {
    renderList([base]);

    expect(screen.getByRole("listitem")).toHaveTextContent("Иван Петров");
    expect(screen.getByRole("listitem")).not.toHaveTextContent("Урок:");
  });
});
