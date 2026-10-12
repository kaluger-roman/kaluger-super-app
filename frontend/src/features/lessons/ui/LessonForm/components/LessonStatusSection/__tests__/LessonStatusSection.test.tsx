import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { theme } from "@shared";
import type { Lesson } from "@shared";

import type { LessonFormData } from "../../../LessonForm.types";
import { LessonStatusSection } from "../LessonStatusSection";

const formData: LessonFormData = {
  withoutStudent: false,
  prospectName: "",
  prospectPhone: "",
  prospectContactMethod: "",
  studentId: "s1",
  subject: "MATHEMATICS",
  lessonType: "SCHOOL",
  startTime: new Date("2026-01-20T10:00:00"),
  endTime: new Date("2026-01-20T11:00:00"),
  description: "",
  price: "100",
  isPaid: false,
  paymentDate: undefined,
  isHomeworkSentByTeacher: false,
  isTaxExempt: false,
  receivedAmount: "",
  homework: "",
  notes: "",
  isRecurring: false,
};

const lesson: Lesson = {
  id: "1",
  studentId: "s1",
  subject: "MATHEMATICS",
  lessonType: "SCHOOL",
  startTime: "2026-01-20T10:00:00",
  endTime: "2026-01-20T11:00:00",
  description: "",
  price: 100,
  isPaid: false,
  status: "SCHEDULED",
  paymentDate: undefined,
  isHomeworkSentByTeacher: false,
  createdAt: "2026-01-20T10:00:00",
  updatedAt: "2026-01-20T10:00:00",
};

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("LessonStatusSection", () => {
  it("should render nothing inside the container when there is no lesson", () => {
    renderWithTheme(<LessonStatusSection formData={formData} setFormData={vi.fn()} />);

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("should render payment and homework toggles for an existing lesson", () => {
    renderWithTheme(
      <LessonStatusSection lesson={lesson} formData={formData} setFormData={vi.fn()} />
    );

    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("should update homework flag in form data through setFormData", async () => {
    const user = userEvent.setup();
    const setFormData = vi.fn();
    renderWithTheme(
      <LessonStatusSection lesson={lesson} formData={formData} setFormData={setFormData} />
    );

    const [, homeworkToggle] = screen.getAllByRole("checkbox");
    await user.click(homeworkToggle);

    expect(setFormData).toHaveBeenCalledTimes(1);
    const [updater] = setFormData.mock.calls[0];
    expect(updater(formData)).toEqual({ ...formData, isHomeworkSentByTeacher: true });
  });

  describe("payment in the form", () => {
    const user = () => userEvent.setup();

    it("should prefill the received amount with the price typed in the form", async () => {
      const u = user();
      renderWithTheme(
        <LessonStatusSection
          lesson={lesson}
          formData={{ ...formData, price: "2500" }}
          setFormData={vi.fn()}
        />
      );

      const [paymentToggle] = screen.getAllByRole("checkbox");
      await u.click(paymentToggle);

      expect(screen.getByText(/2500 ₽/)).toBeInTheDocument();
      expect(screen.getByLabelText(/получено/i)).toHaveValue(2500);
      await u.click(screen.getByRole("button", { name: /отмена/i }));
    });

    it("should write the payment and the received amount into the form data", async () => {
      const u = user();
      const setFormData = vi.fn();
      renderWithTheme(
        <LessonStatusSection lesson={lesson} formData={formData} setFormData={setFormData} />
      );

      const [paymentToggle] = screen.getAllByRole("checkbox");
      await u.click(paymentToggle);
      const amountInput = screen.getByLabelText(/получено/i);
      await u.clear(amountInput);
      await u.type(amountInput, "80");
      await u.click(screen.getByRole("button", { name: /подтвердить/i }));

      expect(setFormData).toHaveBeenCalledTimes(1);
      const [updater] = setFormData.mock.calls[0];
      expect(updater(formData)).toEqual({
        ...formData,
        isPaid: true,
        paymentDate: "2026-01-20",
        receivedAmount: "80",
      });
    });

    it("should clear the received amount when the payment is removed", async () => {
      const u = user();
      const setFormData = vi.fn();
      const paidForm = {
        ...formData,
        isPaid: true,
        paymentDate: "2026-01-20",
        receivedAmount: "80",
      };
      renderWithTheme(
        <LessonStatusSection
          lesson={{ ...lesson, isPaid: true }}
          formData={paidForm}
          setFormData={setFormData}
        />
      );

      const [paymentToggle] = screen.getAllByRole("checkbox");
      await u.click(paymentToggle);
      await u.click(screen.getByRole("button", { name: /подтвердить/i }));

      const [updater] = setFormData.mock.calls[0];
      expect(updater(paidForm)).toEqual({
        ...paidForm,
        isPaid: false,
        paymentDate: undefined,
        receivedAmount: "",
      });
    });
  });
});
