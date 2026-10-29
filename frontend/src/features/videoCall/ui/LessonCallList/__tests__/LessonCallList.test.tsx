import { ThemeProvider } from "@mui/material";
import { render, screen, within } from "@testing-library/react";
import { fork } from "effector";
import type { Scope } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { lessonCallsModel } from "@entities";
import type { CallHistoryRecord } from "@entities";
import { getLessonCalls } from "@entities/callRecord/api";
import { theme } from "@shared";

import { LessonCallList } from "../LessonCallList";

vi.mock("@entities/callRecord/api", () => ({
  getCallHistory: vi.fn(),
  getLessonCalls: vi.fn(),
}));

const mockedGetLessonCalls = vi.mocked(getLessonCalls);

const CALLS: CallHistoryRecord[] = [
  {
    id: "c-2",
    peerName: "Иван Петров",
    direction: "outgoing",
    startedAt: "2026-10-22T15:01:00",
    durationSeconds: 3524,
    status: "COMPLETED",
    lesson: null,
  },
  {
    id: "c-1",
    peerName: "Иван Петров",
    direction: "incoming",
    startedAt: "2026-10-22T14:58:00",
    durationSeconds: null,
    status: "MISSED",
    lesson: null,
  },
];

const renderList = (scope: Scope = fork()) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <LessonCallList lessonId="lesson-1" />
      </ThemeProvider>
    </EffectorProvider>
  );

const waitForLoadSettled = (scope: Scope) =>
  vi.waitFor(() => {
    expect(mockedGetLessonCalls).toHaveBeenCalled();
    expect(scope.getState(lessonCallsModel.loadLessonCallsFx.inFlight)).toBe(0);
  });

describe("LessonCallList", () => {
  beforeEach(() => {
    mockedGetLessonCalls.mockReset();
  });

  it("should list the calls of the lesson with direction, time, outcome and duration", async () => {
    mockedGetLessonCalls.mockResolvedValue(CALLS);
    renderList();

    const list = await screen.findByRole("list", { name: "Звонки по уроку" });
    const rows = within(list).getAllByRole("listitem");
    expect(mockedGetLessonCalls).toHaveBeenCalledWith("lesson-1");
    expect(screen.getByText("📞 Звонки по уроку")).toBeInTheDocument();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Исходящий");
    expect(rows[0]).toHaveTextContent("22.10.2026 15:01");
    expect(rows[0]).toHaveTextContent("Завершён");
    expect(rows[0]).toHaveTextContent("58:44");
    expect(rows[1]).toHaveTextContent("Входящий");
    expect(rows[1]).toHaveTextContent("Пропущен");
  });

  it("should render nothing for a lesson without calls", async () => {
    mockedGetLessonCalls.mockResolvedValue([]);
    const scope = fork();
    const { container } = renderList(scope);

    await waitForLoadSettled(scope);
    expect(container).toBeEmptyDOMElement();
  });

  it("should render nothing when the calls cannot be loaded", async () => {
    mockedGetLessonCalls.mockRejectedValue(new Error("network"));
    const scope = fork();
    const { container } = renderList(scope);

    await waitForLoadSettled(scope);
    expect(container).toBeEmptyDOMElement();
  });

  it("should load the calls of another lesson when the lesson changes without unmounting", async () => {
    mockedGetLessonCalls.mockResolvedValueOnce([CALLS[0]]).mockResolvedValueOnce([CALLS[1]]);
    const scope = fork();
    const ui = (lessonId: string) => (
      <EffectorProvider value={scope}>
        <ThemeProvider theme={theme}>
          <LessonCallList lessonId={lessonId} />
        </ThemeProvider>
      </EffectorProvider>
    );
    const { rerender } = render(ui("lesson-1"));
    expect(await screen.findByText("Исходящий")).toBeInTheDocument();

    rerender(ui("lesson-2"));

    expect(await screen.findByText("Входящий")).toBeInTheDocument();
    expect(screen.queryByText("Исходящий")).not.toBeInTheDocument();
    expect(mockedGetLessonCalls).toHaveBeenCalledTimes(2);
    expect(mockedGetLessonCalls).toHaveBeenLastCalledWith("lesson-2");
  });
});
