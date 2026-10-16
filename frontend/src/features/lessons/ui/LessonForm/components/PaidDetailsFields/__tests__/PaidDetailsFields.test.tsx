import { ThemeProvider } from "@mui/material";
import { fireEvent, render, screen } from "@testing-library/react";
import { allSettled, fork } from "effector";
import { Provider } from "effector-react";
import { describe, expect, it, vi } from "vitest";

import { theme } from "@shared";
import type { Lesson } from "@shared";

import { lessonFormModel } from "../../../../../models";
import type { LessonFormData } from "../../../LessonForm.types";
import { PaidDetailsFields } from "../PaidDetailsFields";

const formData = {
  isPaid: true,
  paymentDate: "2026-01-10",
  receivedAmount: "1800",
  price: "2000",
} as LessonFormData;

const paidLesson: Lesson = {
  id: "lesson-1",
  studentId: "student-1",
  subject: "PHYSICS",
  lessonType: "EGE",
  startTime: "2026-01-15T10:00:00.000Z",
  endTime: "2026-01-15T11:00:00.000Z",
  status: "COMPLETED",
  isPaid: true,
  price: 2000,
  receivedAmount: 2000,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const setupFields = (scope = fork(), data = formData) => {
  const updates: LessonFormData[] = [];
  const setFormData = vi.fn((updater: (prev: LessonFormData) => LessonFormData) => {
    updates.push(updater(data));
  });
  render(
    <Provider value={scope}>
      <ThemeProvider theme={theme}>
        <PaidDetailsFields
          formData={data}
          isLoading={false}
          isMobile={false}
          setFormData={setFormData}
        />
      </ThemeProvider>
    </Provider>
  );
  return updates;
};

describe("PaidDetailsFields", () => {
  it("should show the payment date and the received amount from the form", () => {
    setupFields();

    expect(screen.getByLabelText("Дата оплаты")).toHaveValue("2026-01-10");
    expect(screen.getByLabelText("Получено (₽)")).toHaveValue(1800);
  });

  it("should write the typed amount into the form data", () => {
    const updates = setupFields();

    fireEvent.change(screen.getByLabelText("Получено (₽)"), { target: { value: "2500" } });

    expect(updates).toEqual([{ ...formData, receivedAmount: "2500" }]);
  });

  it("should write the payment date into the form data", () => {
    const updates = setupFields();

    fireEvent.change(screen.getByLabelText("Дата оплаты"), { target: { value: "2026-01-12" } });

    expect(updates).toEqual([{ ...formData, paymentDate: "2026-01-12" }]);
  });

  it("should show the received amount error of the form model", async () => {
    const scope = fork();
    await allSettled(lessonFormModel.formOpened, {
      scope,
      params: { open: true, lesson: paidLesson },
    });
    await allSettled(lessonFormModel.fieldChanged, {
      scope,
      params: { field: "receivedAmount", value: "" },
    });

    setupFields(scope, { ...formData, receivedAmount: "" });

    expect(screen.getByText("Укажите полученную сумму")).toBeInTheDocument();
  });
});
