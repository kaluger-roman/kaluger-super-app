import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createWatch, fork } from "effector";
import type { Scope, ValueMap } from "effector";
import { Provider } from "effector-react";
import { describe, it, expect, vi } from "vitest";

import { lessonModel } from "@entities";
import { lessonDeleteDialogModel, rescheduleDialogModel, theme } from "@shared";
import type { Lesson } from "@shared";

import { lessonsModel } from "../../../models";
import { LessonDialogs } from "../LessonDialogs";

vi.mock("@entities/callRecord/api", () => ({
  getCallHistory: vi.fn(),
  getLessonCalls: vi.fn().mockResolvedValue([]),
}));

vi.mock("@mui/material", async () => {
  const actual = await vi.importActual<typeof import("@mui/material")>("@mui/material");
  return { ...actual, useMediaQuery: () => false };
});

const LESSON: Lesson = {
  id: "lesson-1",
  subject: "MATHEMATICS",
  lessonType: "EGE",
  startTime: "2026-09-15T10:00:00.000Z",
  endTime: "2026-09-15T11:30:00.000Z",
  price: 2000,
  isPaid: true,
  paymentDate: "2026-09-15T00:00:00.000Z",
  receivedAmount: 2000,
  status: "COMPLETED",
  isRecurring: false,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  studentId: "student-1",
  student: { id: "student-1", name: "Анна Смирнова", archived: false },
};

const pending = () => new Promise<never>(() => undefined);

// Mutations never settle, so the list reloads they trigger stay out of the test.
const createScope = (values: ValueMap = []) =>
  fork({
    values,
    handlers: [
      [lessonModel.removeLessonFx, vi.fn(pending)],
      [lessonModel.updateLessonFx, vi.fn(pending)],
    ],
  });

const renderDialogs = (scope: Scope) =>
  render(
    <Provider value={scope}>
      <ThemeProvider theme={theme}>
        <LessonDialogs />
      </ThemeProvider>
    </Provider>
  );

describe("LessonDialogs", () => {
  it("should render nothing visible while every dialog is closed", () => {
    renderDialogs(createScope());

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("should render the lesson form", () => {
    renderDialogs(createScope([[lessonsModel.$isDialogOpen, true]]));

    expect(screen.getByText("Создать новый урок")).toBeInTheDocument();
  });

  it("should render the lesson popup", () => {
    renderDialogs(
      createScope([
        [lessonsModel.$viewingLesson, LESSON],
        [lessonsModel.$isViewDialogOpen, true],
      ])
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Анна Смирнова")).toBeInTheDocument();
  });

  it("should render the confirm dialog from the store and run its action", async () => {
    const action = vi.fn();
    const scope = createScope([
      [
        lessonsModel.$confirmDialog,
        { open: true, title: "Отменить урок", message: "Точно отменить?", action },
      ],
    ]);
    renderDialogs(scope);

    await userEvent.click(screen.getByRole("button", { name: "Подтвердить" }));

    expect(action).toHaveBeenCalledTimes(1);
    expect(scope.getState(lessonsModel.$confirmDialog).open).toBe(false);
  });

  it("should request the deletion when the delete dialog is confirmed", async () => {
    const scope = createScope([
      [lessonDeleteDialogModel.$isOpen, true],
      [lessonDeleteDialogModel.$lesson, LESSON],
    ]);
    const deleteRequested = vi.fn();
    createWatch({ unit: lessonsModel.lessonDeleteRequestedFromDialog, fn: deleteRequested, scope });
    renderDialogs(scope);

    await userEvent.click(screen.getByRole("button", { name: "Удалить" }));

    expect(deleteRequested).toHaveBeenCalledWith({ deleteAllFuture: undefined });
  });

  it("should request the reschedule when the reschedule dialog is confirmed", async () => {
    const newStartTime = new Date("2026-09-20T10:00:00.000Z");
    const newEndTime = new Date("2026-09-20T11:30:00.000Z");
    const scope = createScope([
      [rescheduleDialogModel.$isOpen, true],
      [rescheduleDialogModel.$lesson, LESSON],
      [rescheduleDialogModel.$newStartTime, newStartTime],
      [rescheduleDialogModel.$newEndTime, newEndTime],
    ]);
    const rescheduleRequested = vi.fn();
    createWatch({
      unit: lessonsModel.lessonRescheduleRequestedFromDialog,
      fn: rescheduleRequested,
      scope,
    });
    renderDialogs(scope);

    await userEvent.click(screen.getByRole("button", { name: "Перенести урок" }));

    expect(rescheduleRequested).toHaveBeenCalledWith({ newStartTime, newEndTime });
  });
});
