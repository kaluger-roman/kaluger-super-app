import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { allSettled, createWatch, fork } from "effector";
import { Provider } from "effector-react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Lesson } from "@shared";
import { theme } from "@shared";

import { lessonPaymentChanged } from "../../../models/lessonActions.model";
import { PaymentStatus } from "../PaymentStatus";
import * as paymentStatusModel from "../PaymentStatus.model";

const renderWithTheme = (ui: React.ReactElement, scope = fork()) =>
  render(
    <Provider value={scope}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </Provider>
  );

const mockLesson: Lesson = {
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
};

describe("PaymentStatus Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render switch for unpaid lesson", () => {
      const scope = fork();

      renderWithTheme(<PaymentStatus lesson={mockLesson} />, scope);

      expect(screen.getByRole("checkbox")).toBeInTheDocument();
      expect(screen.getByRole("checkbox")).not.toBeChecked();
    });

    it("should render switch for paid lesson", () => {
      const scope = fork();
      const paidLesson = { ...mockLesson, isPaid: true, paymentDate: "2026-02-15T10:00:00.000Z" };

      renderWithTheme(<PaymentStatus lesson={paidLesson} />, scope);

      expect(screen.getByRole("checkbox")).toBeInTheDocument();
      expect(screen.getByRole("checkbox")).toBeChecked();
    });

    it("should not render for lesson without price", () => {
      const scope = fork();
      const freeLesson = { ...mockLesson, price: undefined };

      const { container } = renderWithTheme(<PaymentStatus lesson={freeLesson} />, scope);

      expect(container).toBeEmptyDOMElement();
    });

    it("should not render for cancelled lesson", () => {
      const scope = fork();
      const cancelledLesson = { ...mockLesson, status: "CANCELLED" as const };

      const { container } = renderWithTheme(<PaymentStatus lesson={cancelledLesson} />, scope);

      expect(container).toBeEmptyDOMElement();
    });

    it("should render label when showLabel is true", () => {
      const scope = fork();

      renderWithTheme(<PaymentStatus lesson={mockLesson} showLabel={true} />, scope);

      expect(screen.getByText(/оплачено/i)).toBeInTheDocument();
    });

    it("should not render label when showLabel is false", () => {
      const scope = fork();

      renderWithTheme(<PaymentStatus lesson={mockLesson} showLabel={false} />, scope);

      expect(screen.queryByText(/оплачено/i)).not.toBeInTheDocument();
    });

    it("should render small size switch", () => {
      const scope = fork();

      renderWithTheme(<PaymentStatus lesson={mockLesson} size="small" />, scope);

      const switchControl = screen.getByRole("checkbox");
      expect(switchControl).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should render switch for toggle interaction", async () => {
      const scope = fork();

      renderWithTheme(<PaymentStatus lesson={mockLesson} />, scope);

      const switchControl = screen.getByRole("checkbox");
      expect(switchControl).toBeInTheDocument();
    });

    it("should render confirmation dialog when open", async () => {
      const scope = fork();

      await allSettled(paymentStatusModel.confirmDialogOpened, {
        scope,
        params: { isPaid: true, price: 2000 },
      });

      renderWithTheme(<PaymentStatus lesson={mockLesson} />, scope);

      expect(screen.getByText(/отметить как оплачено/i)).toBeInTheDocument();
    });

    it("should call confirm action when confirmed", async () => {
      const scope = fork();
      const mockOnPaymentChange = vi.fn();

      await allSettled(paymentStatusModel.confirmDialogOpened, {
        scope,
        params: { isPaid: true, price: 2000 },
      });

      renderWithTheme(
        <PaymentStatus lesson={mockLesson} onPaymentChange={mockOnPaymentChange} />,
        scope
      );

      const confirmButton = screen.getByRole("button", { name: /подтвердить/i });
      await userEvent.click(confirmButton);

      expect(mockOnPaymentChange).toHaveBeenCalledWith(
        mockLesson.id,
        true,
        expect.any(String),
        2000
      );
    });

    it("should render cancel button in dialog", async () => {
      const scope = fork();

      await allSettled(paymentStatusModel.confirmDialogOpened, {
        scope,
        params: { isPaid: true, price: 2000 },
      });

      renderWithTheme(<PaymentStatus lesson={mockLesson} />, scope);

      const cancelButton = screen.getByRole("button", { name: /отмена/i });
      expect(cancelButton).toBeInTheDocument();
    });

    it("should stop event propagation on click", async () => {
      const scope = fork();
      const parentClickHandler = vi.fn();

      const { container } = renderWithTheme(
        <div onClick={parentClickHandler}>
          <PaymentStatus lesson={mockLesson} />
        </div>,
        scope
      );

      const label = container.querySelector("label");
      expect(label).toBeInTheDocument();
      if (!label) return;

      await userEvent.click(label);
      expect(parentClickHandler).not.toHaveBeenCalled();
    });
  });

  describe("Payment date", () => {
    it("should allow setting payment date in dialog", async () => {
      const scope = fork();

      await allSettled(paymentStatusModel.confirmDialogOpened, {
        scope,
        params: { isPaid: true, price: 2000 },
      });

      renderWithTheme(<PaymentStatus lesson={mockLesson} />, scope);

      const dateField = screen.getByLabelText(/дата оплаты/i);
      expect(dateField).toBeInTheDocument();
    });

    it("should show payment date for paid lesson", () => {
      const scope = fork();
      const paidLesson = {
        ...mockLesson,
        isPaid: true,
        paymentDate: "2026-02-15T10:00:00.000Z",
      };

      renderWithTheme(<PaymentStatus lesson={paidLesson} />, scope);

      expect(screen.getByRole("checkbox")).toBeChecked();
    });
  });

  describe("Custom callback", () => {
    it("should use custom onPaymentChange when provided", async () => {
      const scope = fork();
      const mockOnPaymentChange = vi.fn();

      await allSettled(paymentStatusModel.confirmDialogOpened, {
        scope,
        params: { isPaid: false, price: 2000 },
      });

      renderWithTheme(
        <PaymentStatus lesson={mockLesson} onPaymentChange={mockOnPaymentChange} />,
        scope
      );

      const confirmButton = screen.getByRole("button", { name: /подтвердить/i });
      await userEvent.click(confirmButton);

      expect(mockOnPaymentChange).toHaveBeenCalledWith(mockLesson.id, false, undefined, undefined);
    });
  });

  describe("Received amount", () => {
    const capturePayments = (scope: ReturnType<typeof fork>) => {
      const payloads: unknown[] = [];
      createWatch({ unit: lessonPaymentChanged, scope, fn: (payload) => payloads.push(payload) });
      return payloads;
    };

    const toggleSwitch = () => userEvent.click(screen.getByRole("checkbox"));

    it("should show the payment date and the price as the received amount", async () => {
      renderWithTheme(<PaymentStatus lesson={mockLesson} />, fork());

      await toggleSwitch();

      expect(screen.getByLabelText(/дата оплаты/i)).toHaveValue("2026-02-15");
      expect(screen.getByLabelText(/получено/i)).toHaveValue(2000);
    });

    it("should send the edited received amount on confirm", async () => {
      const scope = fork();
      const payloads = capturePayments(scope);
      renderWithTheme(<PaymentStatus lesson={mockLesson} />, scope);

      await toggleSwitch();
      const amountInput = screen.getByLabelText(/получено/i);
      await userEvent.clear(amountInput);
      await userEvent.type(amountInput, "1800");
      await userEvent.click(screen.getByRole("button", { name: /подтвердить/i }));

      expect(payloads).toEqual([
        { lessonId: "lesson-1", isPaid: true, paymentDate: "2026-02-15", receivedAmount: 1800 },
      ]);
      expect(scope.getState(paymentStatusModel.$isOpen)).toBe(false);
    });

    it("should block confirm and Enter while the amount is empty", async () => {
      const scope = fork();
      const payloads = capturePayments(scope);
      renderWithTheme(<PaymentStatus lesson={mockLesson} />, scope);

      await toggleSwitch();
      await userEvent.clear(screen.getByLabelText(/получено/i));

      expect(screen.getByText("Укажите полученную сумму")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /подтвердить/i })).toBeDisabled();
      await userEvent.type(screen.getByRole("dialog"), "{Enter}");
      expect(payloads).toEqual([]);
      expect(scope.getState(paymentStatusModel.$isOpen)).toBe(true);
    });

    it("should not show the amount field when removing the payment", async () => {
      const scope = fork();
      const payloads = capturePayments(scope);
      renderWithTheme(
        <PaymentStatus lesson={{ ...mockLesson, isPaid: true, receivedAmount: 1800 }} />,
        scope
      );

      await toggleSwitch();

      expect(screen.queryByLabelText(/получено/i)).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: /подтвердить/i }));
      expect(payloads).toEqual([
        { lessonId: "lesson-1", isPaid: false, paymentDate: undefined, receivedAmount: undefined },
      ]);
    });

    it("should pass the received amount to onPaymentChange as the fourth argument", async () => {
      const onPaymentChange = vi.fn();
      renderWithTheme(
        <PaymentStatus lesson={{ ...mockLesson, price: 2500 }} onPaymentChange={onPaymentChange} />,
        fork()
      );

      await toggleSwitch();
      await userEvent.click(screen.getByRole("button", { name: /подтвердить/i }));

      expect(onPaymentChange).toHaveBeenCalledWith("lesson-1", true, "2026-02-15", 2500);
    });
  });
});
