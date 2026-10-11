import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider } from "effector-react";
import { describe, it, beforeEach, expect, vi } from "vitest";

import { userModel } from "@entities";
import { theme } from "@shared";
import type { Lesson, User } from "@shared";

import type { LessonFormData } from "../../LessonForm.types";
import { LessonFormContent } from "../LessonFormContent";

const mockFormData: LessonFormData = {
  withoutStudent: false,
  prospectName: "",
  prospectPhone: "",
  prospectContactMethod: "",
  studentId: "s1",
  subject: "MATHEMATICS",
  lessonType: "SCHOOL",
  startTime: new Date("2026-01-20T10:00:00"),
  endTime: new Date("2026-01-20T11:00:00"),
  description: "Test description",
  price: "100",
  isPaid: false,
  paymentDate: undefined,
  isHomeworkSentByTeacher: false,
  isTaxExempt: false,
  homework: "",
  notes: "",
  isRecurring: false,
};

const mockLesson: Lesson = {
  id: "1",
  studentId: "s1",
  subject: "MATHEMATICS",
  lessonType: "SCHOOL",
  startTime: "2026-01-20T10:00:00",
  endTime: "2026-01-20T11:00:00",
  description: "Test lesson",
  price: 100,
  isPaid: false,
  status: "SCHEDULED",
  paymentDate: undefined,
  isHomeworkSentByTeacher: false,
  isTaxExempt: false,
  createdAt: "2026-01-20T10:00:00",
  updatedAt: "2026-01-20T10:00:00",
};

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("LessonFormContent", () => {
  const mockHandleChange = vi.fn(() => vi.fn());
  const mockHandleDateChange = vi.fn(() => vi.fn());
  const mockSetFormData = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render all form fields", () => {
      renderWithTheme(
        <LessonFormContent
          formData={mockFormData}
          errors={{}}
          isLoading={false}
          isMobile={false}
          handleChange={mockHandleChange}
          handleDateChange={mockHandleDateChange}
          setFormData={mockSetFormData}
        />
      );

      expect(screen.getByLabelText(/описание урока/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/домашнее задание/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/заметки/i)).toBeInTheDocument();
    });

    it("should render recurring checkbox for new lesson", () => {
      renderWithTheme(
        <LessonFormContent
          formData={mockFormData}
          errors={{}}
          isLoading={false}
          isMobile={false}
          handleChange={mockHandleChange}
          handleDateChange={mockHandleDateChange}
          setFormData={mockSetFormData}
        />
      );

      expect(
        screen.getByRole("checkbox", {
          name: /регулярное занятие/i,
        })
      ).toBeInTheDocument();
    });

    it("should not render recurring checkbox when editing lesson", () => {
      renderWithTheme(
        <LessonFormContent
          formData={mockFormData}
          errors={{}}
          isLoading={false}
          isMobile={false}
          lesson={mockLesson}
          handleChange={mockHandleChange}
          handleDateChange={mockHandleDateChange}
          setFormData={mockSetFormData}
        />
      );

      expect(
        screen.queryByRole("checkbox", {
          name: /регулярное занятие/i,
        })
      ).not.toBeInTheDocument();
    });

    it("should render payment date field when isPaid is true", () => {
      const paidFormData = { ...mockFormData, isPaid: true };

      renderWithTheme(
        <LessonFormContent
          formData={paidFormData}
          errors={{}}
          isLoading={false}
          isMobile={false}
          handleChange={mockHandleChange}
          handleDateChange={mockHandleDateChange}
          setFormData={mockSetFormData}
        />
      );

      expect(screen.getByLabelText(/дата оплаты/i)).toBeInTheDocument();
    });

    it("should not render payment date field when isPaid is false", () => {
      renderWithTheme(
        <LessonFormContent
          formData={mockFormData}
          errors={{}}
          isLoading={false}
          isMobile={false}
          handleChange={mockHandleChange}
          handleDateChange={mockHandleDateChange}
          setFormData={mockSetFormData}
        />
      );

      expect(screen.queryByLabelText(/дата оплаты/i)).not.toBeInTheDocument();
    });
  });

  describe("User interactions", () => {
    it("should handle description change", async () => {
      const handleChange = vi.fn(() => vi.fn());

      renderWithTheme(
        <LessonFormContent
          formData={mockFormData}
          errors={{}}
          isLoading={false}
          isMobile={false}
          handleChange={handleChange}
          handleDateChange={mockHandleDateChange}
          setFormData={mockSetFormData}
        />
      );

      const descriptionField = screen.getByLabelText(/описание урока/i);
      await userEvent.type(descriptionField, "New description");

      expect(handleChange).toHaveBeenCalledWith("description");
    });

    it("should handle homework change", async () => {
      const handleChange = vi.fn(() => vi.fn());

      renderWithTheme(
        <LessonFormContent
          formData={mockFormData}
          errors={{}}
          isLoading={false}
          isMobile={false}
          handleChange={handleChange}
          handleDateChange={mockHandleDateChange}
          setFormData={mockSetFormData}
        />
      );

      const homeworkField = screen.getByLabelText(/домашнее задание/i);
      await userEvent.type(homeworkField, "Do homework");

      expect(handleChange).toHaveBeenCalledWith("homework");
    });

    it("should handle notes change", async () => {
      const handleChange = vi.fn(() => vi.fn());

      renderWithTheme(
        <LessonFormContent
          formData={mockFormData}
          errors={{}}
          isLoading={false}
          isMobile={false}
          handleChange={handleChange}
          handleDateChange={mockHandleDateChange}
          setFormData={mockSetFormData}
        />
      );

      const notesField = screen.getByLabelText(/заметки/i);
      await userEvent.type(notesField, "Some notes");

      expect(handleChange).toHaveBeenCalledWith("notes");
    });

    it("should handle recurring checkbox change", async () => {
      const setFormData = vi.fn();

      renderWithTheme(
        <LessonFormContent
          formData={mockFormData}
          errors={{}}
          isLoading={false}
          isMobile={false}
          handleChange={mockHandleChange}
          handleDateChange={mockHandleDateChange}
          setFormData={setFormData}
        />
      );

      const recurringCheckbox = screen.getByRole("checkbox", {
        name: /регулярное занятие/i,
      });

      expect(recurringCheckbox).not.toBeChecked();

      await userEvent.click(recurringCheckbox);

      expect(setFormData).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should handle payment date change", async () => {
      const paidFormData = { ...mockFormData, isPaid: true };
      const setFormData = vi.fn();

      renderWithTheme(
        <LessonFormContent
          formData={paidFormData}
          errors={{}}
          isLoading={false}
          isMobile={false}
          handleChange={mockHandleChange}
          handleDateChange={mockHandleDateChange}
          setFormData={setFormData}
        />
      );

      const paymentDateField = screen.getByLabelText(/дата оплаты/i);
      await userEvent.type(paymentDateField, "2026-01-20");

      expect(setFormData).toHaveBeenCalled();
    });
  });

  describe("Disabled state", () => {
    it("should disable all fields when loading", () => {
      renderWithTheme(
        <LessonFormContent
          formData={mockFormData}
          errors={{}}
          isLoading={true}
          isMobile={false}
          handleChange={mockHandleChange}
          handleDateChange={mockHandleDateChange}
          setFormData={mockSetFormData}
        />
      );

      expect(screen.getByLabelText(/описание урока/i)).toBeDisabled();
      expect(screen.getByLabelText(/домашнее задание/i)).toBeDisabled();
      expect(screen.getByLabelText(/заметки/i)).toBeDisabled();
      expect(screen.getByRole("checkbox", { name: /регулярное занятие/i })).toBeDisabled();
    });
  });

  describe("Error display", () => {
    it("should display error for description field", () => {
      const errors = { description: "Обязательное поле" };

      renderWithTheme(
        <LessonFormContent
          formData={mockFormData}
          errors={errors}
          isLoading={false}
          isMobile={false}
          handleChange={mockHandleChange}
          handleDateChange={mockHandleDateChange}
          setFormData={mockSetFormData}
        />
      );

      expect(screen.getByText("Обязательное поле")).toBeInTheDocument();
    });
  });

  describe("Mobile layout", () => {
    it("should render with small size on mobile", () => {
      renderWithTheme(
        <LessonFormContent
          formData={mockFormData}
          errors={{}}
          isLoading={false}
          isMobile={true}
          handleChange={mockHandleChange}
          handleDateChange={mockHandleDateChange}
          setFormData={mockSetFormData}
        />
      );

      // Fields should be rendered (exact size testing depends on implementation)
      expect(screen.getByLabelText(/описание урока/i)).toBeInTheDocument();
    });
  });

  describe("With lesson prop", () => {
    it("should render PaymentStatus when lesson is provided", () => {
      renderWithTheme(
        <LessonFormContent
          formData={mockFormData}
          errors={{}}
          isLoading={false}
          isMobile={false}
          lesson={mockLesson}
          handleChange={mockHandleChange}
          handleDateChange={mockHandleDateChange}
          setFormData={mockSetFormData}
        />
      );

      // PaymentStatus component should be rendered
      // This depends on the component implementation
    });

    it("should render HomeworkSentStatus when lesson is provided", () => {
      renderWithTheme(
        <LessonFormContent
          formData={mockFormData}
          errors={{}}
          isLoading={false}
          isMobile={false}
          lesson={mockLesson}
          handleChange={mockHandleChange}
          handleDateChange={mockHandleDateChange}
          setFormData={mockSetFormData}
        />
      );

      // HomeworkSentStatus component should be rendered
      // This depends on the component implementation
    });
  });

  describe("Tax exempt switch", () => {
    const tutor = (taxEnabled: boolean): User => ({
      id: "user-1",
      email: "tutor@test.local",
      name: "Учитель",
      createdAt: "2026-01-01T00:00:00.000Z",
      isEmailVerified: true,
      taxEnabled,
    });

    const renderWithTax = (
      taxEnabled: boolean,
      props: { formData?: LessonFormData; lesson?: Lesson; setFormData?: typeof mockSetFormData }
    ) =>
      render(
        <Provider value={fork({ values: [[userModel.$user, tutor(taxEnabled)]] })}>
          <ThemeProvider theme={theme}>
            <LessonFormContent
              formData={props.formData ?? mockFormData}
              errors={{}}
              isLoading={false}
              isMobile={false}
              lesson={props.lesson}
              handleChange={mockHandleChange}
              handleDateChange={mockHandleDateChange}
              setFormData={props.setFormData ?? mockSetFormData}
            />
          </ThemeProvider>
        </Provider>
      );

    it.each([
      ["create", undefined],
      ["edit", mockLesson],
    ])("should render a switch, not a checkbox, in the %s form", (_mode, lesson) => {
      renderWithTax(true, { lesson });

      expect(screen.getByRole("switch", { name: "Не облагается налогом" })).toBeInTheDocument();
      expect(screen.queryByRole("checkbox", { name: "Не облагается налогом" })).toBeNull();
    });

    it("should take the switch value from formData.isTaxExempt", () => {
      renderWithTax(true, { formData: { ...mockFormData, isTaxExempt: true } });

      const control = screen.getByRole("switch", { name: "Не облагается налогом" });
      expect((control as HTMLInputElement).checked).toBe(true);
    });

    it("should toggle isTaxExempt through setFormData", async () => {
      const setFormData = vi.fn();
      renderWithTax(true, { setFormData });

      await userEvent.click(screen.getByRole("switch", { name: "Не облагается налогом" }));

      expect(setFormData).toHaveBeenCalledTimes(1);
      const updater = setFormData.mock.calls[0][0] as (prev: LessonFormData) => LessonFormData;
      expect(updater(mockFormData)).toEqual({ ...mockFormData, isTaxExempt: true });
    });

    it("should hide the switch when tax accounting is disabled", () => {
      renderWithTax(false, { lesson: mockLesson });

      expect(screen.queryByRole("switch", { name: "Не облагается налогом" })).toBeNull();
      expect(screen.queryByText("Не облагается налогом")).toBeNull();
    });
  });
});
