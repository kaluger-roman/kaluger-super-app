import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider } from "effector-react";
import { describe, expect, it } from "vitest";

import { theme } from "@shared";
import type { StudentVisibleLesson } from "@shared";

import { studentLessonDialogModel } from "../../../models";
import { StudentLessonCard } from "../StudentLessonCard";

const lesson: StudentVisibleLesson = {
  id: "l-1",
  subject: "PHYSICS",
  startTime: "2026-10-23T15:00:00",
  endTime: "2026-10-23T16:00:00",
  status: "SCHEDULED",
};

const renderCard = () => {
  const scope = fork();
  render(
    <Provider value={scope}>
      <ThemeProvider theme={theme}>
        <StudentLessonCard lesson={lesson} />
      </ThemeProvider>
    </Provider>
  );
  return { scope };
};

describe("StudentLessonCard", () => {
  it("should show the subject, the status and the time of the lesson", () => {
    renderCard();
    expect(screen.getByText("Физика")).toBeInTheDocument();
    expect(screen.getByText("15:00—16:00")).toBeInTheDocument();
  });

  it("should open the lesson dialog on click", async () => {
    const { scope } = renderCard();

    const card = screen.getByRole("button");
    expect(card).toHaveAttribute("aria-haspopup", "dialog");
    await userEvent.click(card);

    expect(scope.getState(studentLessonDialogModel.$openedLessonId)).toBe("l-1");
  });

  it("should open the lesson dialog on Enter", async () => {
    const { scope } = renderCard();

    screen.getByRole("button").focus();
    await userEvent.keyboard("{Enter}");

    expect(scope.getState(studentLessonDialogModel.$openedLessonId)).toBe("l-1");
  });
});
