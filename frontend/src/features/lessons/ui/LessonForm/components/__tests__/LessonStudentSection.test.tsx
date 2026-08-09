import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";

import { theme } from "@shared";
import type { Lesson } from "@shared";

import type { LessonFormData } from "../../types";
import { LessonStudentSection } from "../LessonStudentSection";

const baseFormData: LessonFormData = {
  withoutStudent: false,
  prospectName: "",
  prospectPhone: "",
  prospectContactMethod: "",
  studentId: "",
  subject: "MATHEMATICS",
  lessonType: "SCHOOL",
  startTime: new Date("2026-01-20T10:00:00"),
  endTime: new Date("2026-01-20T11:00:00"),
  description: "",
  price: "",
  isPaid: false,
  paymentDate: undefined,
  isHomeworkSentByTeacher: false,
  homework: "",
  notes: "",
  isRecurring: false,
};

const renderSection = (formData: LessonFormData, lesson?: Lesson) =>
  render(
    <ThemeProvider theme={theme}>
      <LessonStudentSection
        formData={formData}
        errors={{}}
        isLoading={false}
        isMobile={false}
        lesson={lesson}
        onChange={() => () => undefined}
      />
    </ThemeProvider>
  );

describe("LessonStudentSection", () => {
  it("should render the 'Пробный урок' checkbox with an info tooltip", () => {
    renderSection(baseFormData);

    expect(
      screen.getByRole("checkbox", { name: "Пробный урок" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Что такое пробный урок" })
    ).toBeInTheDocument();
  });

  it("should explain the trial lesson meaning in the tooltip on hover", async () => {
    const user = userEvent.setup();
    renderSection(baseFormData);

    await user.hover(
      screen.getByRole("button", { name: "Что такое пробный урок" })
    );

    expect(await screen.findByText(/создавать карточку ученика не нужно/i)).toBeInTheDocument();
  });

  it("should show prospect fields instead of the student selector in trial mode", () => {
    renderSection({ ...baseFormData, withoutStudent: true });

    expect(screen.getByLabelText(/имя ученика/i)).toBeInTheDocument();
  });
});
