import { ThemeProvider } from "@mui/material";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider } from "effector-react";
import { describe, expect, it } from "vitest";

import { studentUserModel } from "@entities";
import { theme } from "@shared";
import type { StudentSession, StudentVisibleLesson } from "@shared";

import { CallConfirmDialog, callConfirmModel } from "../../../../videoCall";
import { studentLessonDialogModel, studentScheduleModel } from "../../../models";
import { StudentLessonDialog } from "../StudentLessonDialog";

const lesson: StudentVisibleLesson = {
  id: "l-1",
  subject: "PHYSICS",
  startTime: "2026-10-23T15:00:00",
  endTime: "2026-10-23T16:30:00",
  status: "COMPLETED",
};

const session: StudentSession = {
  id: "su-1",
  email: "student@example.com",
  name: "Иван",
  isEmailVerified: true,
  tutor: { name: "Анна Кузнецова" },
};

const renderDialog = (openedLessonId: string | null = "l-1") => {
  const scope = fork({
    values: [
      [studentScheduleModel.$lessons, [lesson]],
      [studentLessonDialogModel.$openedLessonId, openedLessonId],
      [studentUserModel.$studentSession, session],
    ],
  });
  const view = render(
    <Provider value={scope}>
      <ThemeProvider theme={theme}>
        <StudentLessonDialog />
        <CallConfirmDialog />
      </ThemeProvider>
    </Provider>
  );
  return { scope, ...view };
};

describe("StudentLessonDialog", () => {
  it("should render nothing without an opened lesson", () => {
    const { container } = renderDialog(null);
    expect(container).toBeEmptyDOMElement();
  });

  it("should show the lesson: subject, status, day, time, duration and tutor", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog", { name: "Урок" });
    expect(dialog).toHaveTextContent("Физика");
    expect(dialog).toHaveTextContent("Завершён");
    expect(dialog).toHaveTextContent("Пятница, 23 октября");
    expect(dialog).toHaveTextContent("15:00—16:30");
    expect(dialog).toHaveTextContent("1ч 30мин");
    expect(dialog).toHaveTextContent("Анна Кузнецова");
  });

  it("should close on «Закрыть»", async () => {
    const { scope } = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Закрыть" }));

    expect(scope.getState(studentLessonDialogModel.$openedLessonId)).toBeNull();
  });

  it("should ask to confirm a call to the tutor with the lesson", async () => {
    const { scope } = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Позвонить" }));

    const confirm = await screen.findByRole("dialog", { name: "Начать видеозвонок?" });
    expect(within(confirm).getByText("Анна Кузнецова")).toBeInTheDocument();
    expect(within(confirm).getByText("Звонок по уроку")).toBeInTheDocument();
    expect(scope.getState(callConfirmModel.$isOpen)).toBe(true);
    expect(scope.getState(studentLessonDialogModel.$openedLessonId)).toBe("l-1");
  });
});
