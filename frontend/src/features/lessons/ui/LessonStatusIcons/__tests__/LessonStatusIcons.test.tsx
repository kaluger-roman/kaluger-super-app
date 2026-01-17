import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { allSettled, fork } from "effector";
import { Provider } from "effector-react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Lesson } from "@shared";

import { theme } from "../../../../../shared/ui/themeConfig";
import {
  lessonPaymentChanged,
  lessonHomeworkSentChanged,
} from "../../../models/lesson-actions.model";
import * as lessonStatusIconsModel from "../lesson-status-icons.model";
import { LessonStatusIcons } from "../LessonStatusIcons";

const renderWithTheme = (ui: React.ReactElement, scope = fork()) =>
  render(
    <Provider value={scope}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </Provider>
  );

const createMockLesson = (overrides?: Partial<Lesson>): Lesson => ({
  id: "lesson-1",
  subject: "MATHEMATICS",
  lessonType: "EGE",
  startTime: "2026-02-15T10:00:00.000Z",
  endTime: "2026-02-15T11:30:00.000Z",
  price: 2000,
  isPaid: false,
  status: "SCHEDULED",
  isRecurring: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  studentId: "student-1",
  student: {
    id: "student-1",
    name: "Иван Иванов",
    phone: "+79991234567",
    contactMethod: "WHATSAPP",
    archived: false,
  },
  ...overrides,
});

describe("LessonStatusIcons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Payment icon rendering", () => {
    it("should render payment icon when lesson has price and status is not CANCELLED", () => {
      const lesson = createMockLesson({ price: 2000, status: "SCHEDULED" });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      const paymentButton = screen.getByRole("button", { name: /не оплачено/i });
      expect(paymentButton).toBeInTheDocument();
    });

    it("should not render payment icon when lesson has no price", () => {
      const lesson = createMockLesson({ price: undefined });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      expect(
        screen.queryByRole("button", { name: /оплачено|не оплачено/i })
      ).not.toBeInTheDocument();
    });

    it("should not render payment icon when lesson status is CANCELLED", () => {
      const lesson = createMockLesson({ price: 2000, status: "CANCELLED" });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      expect(
        screen.queryByRole("button", { name: /оплачено|не оплачено/i })
      ).not.toBeInTheDocument();
    });

    it("should render payment icon with paid status", () => {
      const lesson = createMockLesson({ price: 2000, isPaid: true });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      const paymentButton = screen.getByRole("button", { name: /оплачено/i });
      expect(paymentButton).toBeInTheDocument();
    });

    it("should render payment icon with unpaid status", () => {
      const lesson = createMockLesson({ price: 2000, isPaid: false });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      const paymentButton = screen.getByRole("button", { name: /не оплачено/i });
      expect(paymentButton).toBeInTheDocument();
    });
  });

  describe("Homework icon rendering", () => {
    it("should render homework icon when lesson has homework", () => {
      const lesson = createMockLesson({ homework: "Some homework" });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      const homeworkButton = screen.getByRole("button", { name: /дз не отправлено/i });
      expect(homeworkButton).toBeInTheDocument();
    });

    it("should render homework icon when homework is empty string", () => {
      const lesson = createMockLesson({ homework: "" });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      const homeworkButton = screen.getByRole("button", { name: /дз не отправлено/i });
      expect(homeworkButton).toBeInTheDocument();
    });

    it("should not render homework icon when homework is undefined", () => {
      const lesson = createMockLesson({ homework: undefined });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      expect(screen.queryByRole("button", { name: /дз/i })).not.toBeInTheDocument();
    });

    it("should render homework icon with sent status", () => {
      const lesson = createMockLesson({ homework: "Some homework", isHomeworkSentByTeacher: true });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      const homeworkButton = screen.getByRole("button", { name: /дз отправлено/i });
      expect(homeworkButton).toBeInTheDocument();
    });

    it("should render homework icon with unsent status", () => {
      const lesson = createMockLesson({
        homework: "Some homework",
        isHomeworkSentByTeacher: false,
      });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      const homeworkButton = screen.getByRole("button", { name: /дз не отправлено/i });
      expect(homeworkButton).toBeInTheDocument();
    });
  });

  describe("Payment icon click behavior", () => {
    it("should open payment dialog when payment icon is clicked", async () => {
      const scope = fork();
      const lesson = createMockLesson({ price: 2000 });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      const paymentButton = screen.getByRole("button", { name: /не оплачено/i });
      await userEvent.click(paymentButton);

      await allSettled(lessonStatusIconsModel.paymentDialogOpened, {
        scope,
        params: "lesson-1",
      });

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should prevent event propagation when payment icon is clicked", async () => {
      const lesson = createMockLesson({ price: 2000 });
      const parentClickHandler = vi.fn();

      renderWithTheme(
        <div onClick={parentClickHandler}>
          <LessonStatusIcons lesson={lesson} />
        </div>
      );

      const paymentButton = screen.getByRole("button", { name: /не оплачено/i });
      await userEvent.click(paymentButton);

      expect(parentClickHandler).not.toHaveBeenCalled();
    });
  });

  describe("Homework icon click behavior", () => {
    it("should open homework dialog when homework icon is clicked", async () => {
      const scope = fork();
      const lesson = createMockLesson({ homework: "Some homework" });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      const homeworkButton = screen.getByRole("button", { name: /дз не отправлено/i });
      await userEvent.click(homeworkButton);

      await allSettled(lessonStatusIconsModel.homeworkDialogOpened, {
        scope,
        params: "lesson-1",
      });

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should prevent event propagation when homework icon is clicked", async () => {
      const lesson = createMockLesson({ homework: "Some homework" });
      const parentClickHandler = vi.fn();

      renderWithTheme(
        <div onClick={parentClickHandler}>
          <LessonStatusIcons lesson={lesson} />
        </div>
      );

      const homeworkButton = screen.getByRole("button", { name: /дз не отправлено/i });
      await userEvent.click(homeworkButton);

      expect(parentClickHandler).not.toHaveBeenCalled();
    });
  });

  describe("Payment dialog", () => {
    it("should open payment dialog when payment icon is clicked", async () => {
      const scope = fork();
      const lesson = createMockLesson({ price: 2000, isPaid: false });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      await allSettled(lessonStatusIconsModel.paymentDialogOpened, { scope, params: "lesson-1" });

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Отметить как оплачено")).toBeInTheDocument();
    });

    it("should show correct dialog title for unpaid lesson", async () => {
      const scope = fork();
      const lesson = createMockLesson({ price: 2000, isPaid: false });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      await allSettled(lessonStatusIconsModel.paymentDialogOpened, { scope, params: "lesson-1" });

      expect(screen.getByText("Отметить как оплачено")).toBeInTheDocument();
    });

    it("should show correct dialog title for paid lesson", async () => {
      const scope = fork();
      const lesson = createMockLesson({ price: 2000, isPaid: true });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      await allSettled(lessonStatusIconsModel.paymentDialogOpened, { scope, params: "lesson-1" });

      expect(screen.getByText("Отметить как неоплаченное")).toBeInTheDocument();
    });

    it("should display date input when marking lesson as paid", async () => {
      const scope = fork();
      const lesson = createMockLesson({ price: 2000, isPaid: false });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      await allSettled(lessonStatusIconsModel.paymentDialogOpened, { scope, params: "lesson-1" });

      expect(screen.getByLabelText(/дата оплаты/i)).toBeInTheDocument();
    });

    it("should not display date input when marking lesson as unpaid", async () => {
      const scope = fork();
      const lesson = createMockLesson({ price: 2000, isPaid: true });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      await allSettled(lessonStatusIconsModel.paymentDialogOpened, { scope, params: "lesson-1" });

      expect(screen.queryByLabelText(/дата оплаты/i)).not.toBeInTheDocument();
    });

    it("should call lessonPaymentChanged with correct params when marking as paid", async () => {
      const scope = fork();
      const lesson = createMockLesson({ price: 2000, isPaid: false });

      let capturedPayload = null;
      lessonPaymentChanged.watch((payload) => {
        capturedPayload = payload;
      });

      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      await allSettled(lessonStatusIconsModel.paymentDialogOpened, { scope, params: "lesson-1" });

      const dateInput = screen.getByLabelText(/дата оплаты/i);
      await userEvent.clear(dateInput);
      await userEvent.type(dateInput, "2026-02-15");

      const confirmButton = screen.getByRole("button", { name: /подтвердить/i });
      await userEvent.click(confirmButton);

      expect(capturedPayload).toEqual({
        lessonId: "lesson-1",
        isPaid: true,
        paymentDate: "2026-02-15",
      });
    });

    it("should call lessonPaymentChanged with correct params when marking as unpaid", async () => {
      const scope = fork();
      const lesson = createMockLesson({ price: 2000, isPaid: true });

      let capturedPayload = null;
      lessonPaymentChanged.watch((payload) => {
        capturedPayload = payload;
      });

      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      await allSettled(lessonStatusIconsModel.paymentDialogOpened, { scope, params: "lesson-1" });

      const confirmButton = screen.getByRole("button", { name: /подтвердить/i });
      await userEvent.click(confirmButton);

      expect(capturedPayload).toEqual({
        lessonId: "lesson-1",
        isPaid: false,
      });
    });

    it("should show student name in payment dialog", async () => {
      const scope = fork();
      const lesson = createMockLesson({ price: 2000 });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      await allSettled(lessonStatusIconsModel.paymentDialogOpened, { scope, params: "lesson-1" });

      expect(screen.getByText(/иван иванов/i)).toBeInTheDocument();
    });

    it("should show price in payment dialog", async () => {
      const scope = fork();
      const lesson = createMockLesson({ price: 2000 });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      await allSettled(lessonStatusIconsModel.paymentDialogOpened, { scope, params: "lesson-1" });

      expect(screen.getByText(/2000 ₽/i)).toBeInTheDocument();
    });

    it("should initialize date input with current payment date if exists", async () => {
      const scope = fork();
      const lesson = createMockLesson({
        price: 2000,
        isPaid: false,
        paymentDate: "2026-02-10T00:00:00.000Z",
      });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      await allSettled(lessonStatusIconsModel.paymentDialogOpened, { scope, params: "lesson-1" });

      const dateInput = screen.getByLabelText(/дата оплаты/i) as HTMLInputElement;
      expect(dateInput.value).toBe("2026-02-10");
    });

    it("should initialize date input with today's date if no payment date exists", async () => {
      const scope = fork();
      const lesson = createMockLesson({ price: 2000, isPaid: false, paymentDate: undefined });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      await allSettled(lessonStatusIconsModel.paymentDialogOpened, { scope, params: "lesson-1" });

      const dateInput = screen.getByLabelText(/дата оплаты/i) as HTMLInputElement;
      const today = new Date().toISOString().split("T")[0];
      expect(dateInput.value).toBe(today);
    });
  });

  describe("Homework dialog", () => {
    it("should open homework dialog when homework icon is clicked", async () => {
      const scope = fork();
      const lesson = createMockLesson({
        homework: "Some homework",
        isHomeworkSentByTeacher: false,
      });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      await allSettled(lessonStatusIconsModel.homeworkDialogOpened, { scope, params: "lesson-1" });

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Отметить ДЗ как отправленное")).toBeInTheDocument();
    });

    it("should show correct dialog title when homework is not sent", async () => {
      const scope = fork();
      const lesson = createMockLesson({
        homework: "Some homework",
        isHomeworkSentByTeacher: false,
      });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      await allSettled(lessonStatusIconsModel.homeworkDialogOpened, { scope, params: "lesson-1" });

      expect(screen.getByText("Отметить ДЗ как отправленное")).toBeInTheDocument();
    });

    it("should show correct dialog title when homework is sent", async () => {
      const scope = fork();
      const lesson = createMockLesson({ homework: "Some homework", isHomeworkSentByTeacher: true });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      await allSettled(lessonStatusIconsModel.homeworkDialogOpened, { scope, params: "lesson-1" });

      expect(screen.getByText("Отметить ДЗ как неотправленное")).toBeInTheDocument();
    });

    it("should call lessonHomeworkSentChanged with correct params when marking as sent", async () => {
      const scope = fork();
      const lesson = createMockLesson({
        homework: "Some homework",
        isHomeworkSentByTeacher: false,
      });

      let capturedPayload = null;
      lessonHomeworkSentChanged.watch((payload) => {
        capturedPayload = payload;
      });

      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      await allSettled(lessonStatusIconsModel.homeworkDialogOpened, { scope, params: "lesson-1" });

      const confirmButton = screen.getByRole("button", { name: /подтвердить/i });
      await userEvent.click(confirmButton);

      expect(capturedPayload).toEqual({
        lessonId: "lesson-1",
        isSent: true,
      });
    });

    it("should call lessonHomeworkSentChanged with correct params when marking as unsent", async () => {
      const scope = fork();
      const lesson = createMockLesson({ homework: "Some homework", isHomeworkSentByTeacher: true });

      let capturedPayload = null;
      lessonHomeworkSentChanged.watch((payload) => {
        capturedPayload = payload;
      });

      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      await allSettled(lessonStatusIconsModel.homeworkDialogOpened, { scope, params: "lesson-1" });

      const confirmButton = screen.getByRole("button", { name: /подтвердить/i });
      await userEvent.click(confirmButton);

      expect(capturedPayload).toEqual({
        lessonId: "lesson-1",
        isSent: false,
      });
    });

    it("should show student name in homework dialog", async () => {
      const scope = fork();
      const lesson = createMockLesson({ homework: "Some homework" });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      await allSettled(lessonStatusIconsModel.homeworkDialogOpened, { scope, params: "lesson-1" });

      expect(screen.getByText(/иван иванов/i)).toBeInTheDocument();
    });

    it("should show price in homework dialog", async () => {
      const scope = fork();
      const lesson = createMockLesson({ homework: "Some homework", price: 2000 });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      await allSettled(lessonStatusIconsModel.homeworkDialogOpened, { scope, params: "lesson-1" });

      expect(screen.getByText(/2000 ₽/i)).toBeInTheDocument();
    });
  });

  describe("Different lesson states", () => {
    it("should render both icons when lesson has price and homework", () => {
      const lesson = createMockLesson({ price: 2000, homework: "Some homework" });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      expect(screen.getByRole("button", { name: /не оплачено/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /дз не отправлено/i })).toBeInTheDocument();
    });

    it("should render only payment icon when lesson has price but no homework", () => {
      const lesson = createMockLesson({ price: 2000, homework: undefined });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      expect(screen.getByRole("button", { name: /не оплачено/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /дз/i })).not.toBeInTheDocument();
    });

    it("should render only homework icon when lesson has homework but no price", () => {
      const lesson = createMockLesson({ price: undefined, homework: "Some homework" });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      expect(
        screen.queryByRole("button", { name: /оплачено|не оплачено/i })
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /дз не отправлено/i })).toBeInTheDocument();
    });

    it("should render nothing when lesson has no price and no homework", () => {
      const lesson = createMockLesson({ price: undefined, homework: undefined });
      const { container } = renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      expect(container.querySelector("button")).not.toBeInTheDocument();
    });

    it("should handle lesson with price 0", () => {
      const lesson = createMockLesson({ price: 0 });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      expect(
        screen.queryByRole("button", { name: /оплачено|не оплачено/i })
      ).not.toBeInTheDocument();
    });

    it("should handle COMPLETED lesson status", () => {
      const lesson = createMockLesson({ price: 2000, status: "COMPLETED" });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      expect(screen.getByRole("button", { name: /не оплачено/i })).toBeInTheDocument();
    });

    it("should handle RESCHEDULED lesson status", () => {
      const lesson = createMockLesson({ price: 2000, status: "RESCHEDULED" });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      expect(screen.getByRole("button", { name: /не оплачено/i })).toBeInTheDocument();
    });

    it("should handle IN_PROGRESS lesson status", () => {
      const lesson = createMockLesson({ price: 2000, status: "IN_PROGRESS" });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      expect(screen.getByRole("button", { name: /не оплачено/i })).toBeInTheDocument();
    });
  });

  describe("Tooltips", () => {
    it("should show tooltip with paid status", async () => {
      const lesson = createMockLesson({ price: 2000, isPaid: true });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      const paymentButton = screen.getByRole("button", { name: /оплачено/i });
      expect(paymentButton).toBeInTheDocument();
    });

    it("should show tooltip with unpaid status", async () => {
      const lesson = createMockLesson({ price: 2000, isPaid: false });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      const paymentButton = screen.getByRole("button", { name: /не оплачено/i });
      expect(paymentButton).toBeInTheDocument();
    });

    it("should show tooltip with homework sent status", async () => {
      const lesson = createMockLesson({ homework: "Some homework", isHomeworkSentByTeacher: true });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      const homeworkButton = screen.getByRole("button", { name: /дз отправлено/i });
      expect(homeworkButton).toBeInTheDocument();
    });

    it("should show tooltip with homework unsent status", async () => {
      const lesson = createMockLesson({
        homework: "Some homework",
        isHomeworkSentByTeacher: false,
      });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />);

      const homeworkButton = screen.getByRole("button", { name: /дз не отправлено/i });
      expect(homeworkButton).toBeInTheDocument();
    });
  });

  describe("Store isolation", () => {
    it("should update $openPaymentDialogFor store when payment icon is clicked", async () => {
      const scope = fork();
      const lesson = createMockLesson({ price: 2000 });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      expect(scope.getState(lessonStatusIconsModel.$openPaymentDialogFor)).toBeNull();

      await allSettled(lessonStatusIconsModel.paymentDialogOpened, { scope, params: "lesson-1" });

      expect(scope.getState(lessonStatusIconsModel.$openPaymentDialogFor)).toBe("lesson-1");
    });

    it("should reset $openPaymentDialogFor store when dialog is closed", async () => {
      const scope = fork();
      const lesson = createMockLesson({ price: 2000 });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      await allSettled(lessonStatusIconsModel.paymentDialogOpened, { scope, params: "lesson-1" });

      expect(scope.getState(lessonStatusIconsModel.$openPaymentDialogFor)).toBe("lesson-1");

      await allSettled(lessonStatusIconsModel.paymentDialogClosed, { scope });

      expect(scope.getState(lessonStatusIconsModel.$openPaymentDialogFor)).toBeNull();
    });

    it("should update $openHomeworkDialogFor store when homework icon is clicked", async () => {
      const scope = fork();
      const lesson = createMockLesson({ homework: "Some homework" });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      expect(scope.getState(lessonStatusIconsModel.$openHomeworkDialogFor)).toBeNull();

      await allSettled(lessonStatusIconsModel.homeworkDialogOpened, { scope, params: "lesson-1" });

      expect(scope.getState(lessonStatusIconsModel.$openHomeworkDialogFor)).toBe("lesson-1");
    });

    it("should reset $openHomeworkDialogFor store when dialog is closed", async () => {
      const scope = fork();
      const lesson = createMockLesson({ homework: "Some homework" });
      renderWithTheme(<LessonStatusIcons lesson={lesson} />, scope);

      await allSettled(lessonStatusIconsModel.homeworkDialogOpened, { scope, params: "lesson-1" });

      expect(scope.getState(lessonStatusIconsModel.$openHomeworkDialogFor)).toBe("lesson-1");

      await allSettled(lessonStatusIconsModel.homeworkDialogClosed, { scope });

      expect(scope.getState(lessonStatusIconsModel.$openHomeworkDialogFor)).toBeNull();
    });

    it("should keep stores isolated between different forks", async () => {
      const scope1 = fork();
      const scope2 = fork();

      await allSettled(lessonStatusIconsModel.paymentDialogOpened, {
        scope: scope1,
        params: "lesson-1",
      });
      await allSettled(lessonStatusIconsModel.paymentDialogOpened, {
        scope: scope2,
        params: "lesson-2",
      });

      expect(scope1.getState(lessonStatusIconsModel.$openPaymentDialogFor)).toBe("lesson-1");
      expect(scope2.getState(lessonStatusIconsModel.$openPaymentDialogFor)).toBe("lesson-2");
    });
  });
});
