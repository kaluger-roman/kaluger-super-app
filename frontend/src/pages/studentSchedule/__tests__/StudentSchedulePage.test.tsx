import { ThemeProvider } from "@mui/material";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider } from "effector-react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { studentUserModel } from "@entities";
import { studentScheduleModel } from "@features";
import { studentCabinetApi, theme } from "@shared";
import type { StudentSession } from "@shared";

import { StudentSchedulePage } from "../StudentSchedulePage";

vi.mock("@shared", async () => {
  const actual = await vi.importActual<typeof import("@shared")>("@shared");
  return {
    ...actual,
    studentCabinetApi: { ...actual.studentCabinetApi, getLessonsByWeek: vi.fn() },
  };
});

const WEEK_START = new Date("2026-10-19T00:00:00");

const session: StudentSession = {
  id: "su-1",
  email: "student@example.com",
  name: "Иван",
  isEmailVerified: true,
  tutor: { name: "Анна Кузнецова" },
};

describe("StudentSchedulePage", () => {
  beforeEach(() => {
    vi.mocked(studentCabinetApi.getLessonsByWeek).mockReset();
    vi.mocked(studentCabinetApi.getLessonsByWeek).mockResolvedValue({
      weekStart: "2026-10-19",
      lessons: [
        {
          id: "l-1",
          subject: "PHYSICS",
          startTime: "2026-10-23T15:00:00",
          endTime: "2026-10-23T16:00:00",
          status: "SCHEDULED",
        },
      ],
    });
  });

  it("should open the lesson from its card and come back to the same week", async () => {
    const scope = fork({
      values: [
        [studentScheduleModel.$weekStart, WEEK_START],
        [studentUserModel.$studentSession, session],
      ],
    });
    render(
      <Provider value={scope}>
        <ThemeProvider theme={theme}>
          <StudentSchedulePage />
        </ThemeProvider>
      </Provider>
    );

    await userEvent.click(await screen.findByRole("button", { name: /Физика/ }));
    expect(await screen.findByRole("dialog", { name: "Урок" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Позвонить" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Закрыть" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(scope.getState(studentScheduleModel.$weekStart)).toEqual(WEEK_START);
    expect(studentCabinetApi.getLessonsByWeek).toHaveBeenCalledTimes(1);
  });
});
