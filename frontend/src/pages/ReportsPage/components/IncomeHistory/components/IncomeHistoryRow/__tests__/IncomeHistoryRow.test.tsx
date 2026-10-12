import { ThemeProvider } from "@mui/material";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createWatch, fork } from "effector";
import { Provider } from "effector-react";
import { describe, it, expect, vi } from "vitest";

import { theme } from "@shared";
import type { IncomeHistoryEntry } from "@shared";

import { incomeHistoryReloadModel } from "../../../../../model";
import { makeEntry, money } from "../../../__tests__/incomeHistory.fixtures";
import { IncomeHistoryRow } from "../IncomeHistoryRow";

const renderRow = (entry: IncomeHistoryEntry) => {
  const scope = fork({
    handlers: [
      [incomeHistoryReloadModel.openLessonFx, vi.fn(() => new Promise<never>(() => undefined))],
    ],
  });
  const lessonOpened = vi.fn();
  createWatch({
    unit: incomeHistoryReloadModel.incomeHistoryLessonOpened,
    fn: lessonOpened,
    scope,
  });
  render(
    <Provider value={scope}>
      <ThemeProvider theme={theme}>
        <IncomeHistoryRow entry={entry} />
      </ThemeProvider>
    </Provider>
  );
  return { lessonOpened };
};

describe("IncomeHistoryRow", () => {
  it("should show the student name and the received amount with kopecks", () => {
    renderRow(makeEntry({ receivedAmount: 1999.5, price: 1999.5 }));

    expect(screen.getByText("Анна Смирнова")).toBeInTheDocument();
    expect(screen.getByText(money(1999.5, true))).toBeInTheDocument();
    expect(screen.queryByText("Архив")).toBeNull();
    expect(screen.queryByText("Пробный урок")).toBeNull();
  });

  it("should mark an archived student", () => {
    renderRow(makeEntry({ student: { name: "Софья", archived: true } }));

    expect(screen.getByText("Архив")).toBeInTheDocument();
  });

  it("should show the contact name of a trial lesson", () => {
    renderRow(makeEntry({ student: null, prospectName: "Пётр" }));

    expect(screen.getByText("Пётр")).toBeInTheDocument();
    expect(screen.getByText("Пробный урок")).toBeInTheDocument();
  });

  it("should describe the lesson subject, type, date and time", () => {
    renderRow(makeEntry());

    expect(
      screen.getByText(/^Математика · ЕГЭ · урок 13 окт\.?, 16:00—17:30$/)
    ).toBeInTheDocument();
  });

  it("should not show a status chip for a completed lesson", () => {
    renderRow(makeEntry());

    expect(screen.queryByText("Предстоящий")).toBeNull();
    expect(screen.queryByText("Отменен")).toBeNull();
  });

  it.each([
    ["SCHEDULED", "Предстоящий"],
    ["CANCELLED", "Отменен"],
  ] as const)("should show the %s status chip", (status, label) => {
    renderRow(makeEntry({ lessonStatus: status }));

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("should mark a payment without a payment date", () => {
    renderRow(makeEntry({ hasPaymentDate: false }));

    expect(screen.getByText("дата оплаты не указана")).toBeInTheDocument();
  });

  it("should not mark a payment with a payment date", () => {
    renderRow(makeEntry());

    expect(screen.queryByText("дата оплаты не указана")).toBeNull();
  });

  it("should mark a payment whose received amount differs from the price", () => {
    renderRow(makeEntry({ receivedAmount: 2000, price: 2500 }));

    expect(
      screen.getByRole("img", { name: /^Получено 2\s000\s₽, стоимость урока 2\s500\s₽$/ })
    ).toBeInTheDocument();
    expect(screen.getByText(money(2000, true))).toBeInTheDocument();
  });

  it("should not mark a payment whose received amount equals the price", () => {
    renderRow(makeEntry({ receivedAmount: 2000, price: 2000 }));

    expect(screen.queryByRole("img", { name: /^Получено/ })).toBeNull();
  });

  it("should show the commission credit of the payment", () => {
    renderRow(makeEntry({ commissionCredit: 1500 }));

    expect(screen.getByText(/^в счёт комиссии: 1\s500\s₽$/)).toBeInTheDocument();
  });

  it("should show no commission mark without a credit", () => {
    renderRow(makeEntry({ commissionCredit: null }));

    expect(screen.queryByText(/в счёт комиссии/)).toBeNull();
  });

  it("should show the tax of the payment", () => {
    renderRow(makeEntry({ tax: { kind: "TAXED", amount: 60, rate: 6 } }));

    expect(screen.getByText(/^налог 60\s₽ · 6%$/)).toBeInTheDocument();
  });

  it("should show no tax without tax data", () => {
    renderRow(makeEntry({ tax: null }));

    expect(screen.queryByText(/налог/)).toBeNull();
  });

  it("should open the lesson of the payment on click", async () => {
    const { lessonOpened } = renderRow(makeEntry({ lessonId: "lesson-42" }));

    await userEvent.click(screen.getByRole("button", { name: /Анна Смирнова/ }));

    expect(lessonOpened).toHaveBeenCalledWith("lesson-42");
  });

  it("should open the lesson of the payment with Enter", async () => {
    const { lessonOpened } = renderRow(makeEntry({ lessonId: "lesson-42" }));

    act(() => screen.getByRole("button", { name: /Анна Смирнова/ }).focus());
    await userEvent.keyboard("{Enter}");

    expect(lessonOpened).toHaveBeenCalledWith("lesson-42");
  });

  it("should not open the lesson when the mismatch mark is pressed", async () => {
    const { lessonOpened } = renderRow(makeEntry({ receivedAmount: 2000, price: 2500 }));
    const mark = screen.getByRole("img", { name: /^Получено/ });

    await userEvent.click(mark);
    act(() => mark.focus());
    await userEvent.keyboard("{Enter}");

    expect(lessonOpened).not.toHaveBeenCalled();
  });
});
