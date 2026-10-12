import { ThemeProvider } from "@mui/material";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { allSettled, createWatch, fork } from "effector";
import type { Scope } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect, vi } from "vitest";

import type { IncomeHistory as IncomeHistoryData } from "@shared";
import { formatWeekRange, theme } from "@shared";

import {
  APPLIED_RANGE,
  EMPTY_HISTORY,
  makeDay,
  makeHistory,
  money,
} from "./incomeHistory.fixtures";
import { incomeHistoryModel, statisticsModel } from "../../../model";
import { IncomeHistory } from "../IncomeHistory";

const LOAD_ERROR =
  "Не удалось загрузить историю поступлений. Нажмите «Обновить», чтобы попробовать ещё раз";
const NEXT_PAGE_ERROR =
  "Не удалось загрузить следующие оплаты. Уже показанные оплаты остались на месте";

const FILLED = makeHistory([makeDay("2026-09-25"), makeDay("2026-09-20")], {
  nextCursor: "2026-09-20",
  remainingCount: 3,
});

const createScope = ({
  history = FILLED,
  error = null,
  nextPageError = null,
}: {
  history?: IncomeHistoryData | null;
  error?: string | null;
  nextPageError?: string | null;
} = {}) =>
  fork({
    values: [
      [incomeHistoryModel.$incomeHistory, history],
      [incomeHistoryModel.$incomeHistoryError, error],
      [incomeHistoryModel.$nextPageError, nextPageError],
      [incomeHistoryModel.$historyVersion, 1],
      [statisticsModel.$appliedRange, APPLIED_RANGE],
    ],
    handlers: [[incomeHistoryModel.loadNextPageFx, () => new Promise(() => undefined)]],
  });

const renderHistory = (scope: Scope) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <IncomeHistory />
      </ThemeProvider>
    </EffectorProvider>
  );

const watchNextPage = (scope: Scope) => {
  const requested = vi.fn();
  createWatch({ unit: incomeHistoryModel.incomeHistoryNextPageRequested, fn: requested, scope });
  return requested;
};

describe("IncomeHistory", () => {
  it("should show the first page error", () => {
    renderHistory(createScope({ error: LOAD_ERROR }));

    expect(screen.getByText(LOAD_ERROR)).toBeInTheDocument();
    expect(screen.queryByText("Поступило за период")).toBeNull();
  });

  it("should show the empty state without the total and the list", () => {
    renderHistory(createScope({ history: EMPTY_HISTORY }));

    expect(screen.getByText("За выбранный период поступлений нет")).toBeInTheDocument();
    expect(screen.queryByText("Поступило за период")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("should explain the applied period and list the days in the response order", () => {
    renderHistory(createScope());

    expect(
      screen.getByText(
        new RegExp(`Оплаты за ${formatWeekRange(APPLIED_RANGE.startDate, APPLIED_RANGE.endDate)}`)
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Поступило за период")).toBeInTheDocument();
    expect(screen.getByTestId("income-history-total")).toHaveTextContent(
      money(FILLED.summary.total)
    );
    const days = screen.getAllByLabelText(/^[А-ЯЁ][а-яё]+, \d+ /);
    expect(days.map((day) => day.getAttribute("aria-label"))).toEqual([
      expect.stringMatching(/^Пятница, 25 сентября/),
      expect.stringMatching(/^Воскресенье, 20 сентября/),
    ]);
  });

  it("should request the next page from «Показать ещё»", async () => {
    const scope = createScope();
    const requested = watchNextPage(scope);
    renderHistory(scope);

    await userEvent.click(screen.getByRole("button", { name: "Показать ещё (осталось 3)" }));

    expect(requested).toHaveBeenCalledTimes(1);
  });

  it("should hide «Показать ещё» when everything is loaded", () => {
    renderHistory(createScope({ history: makeHistory([makeDay("2026-09-25")]) }));

    expect(screen.queryByRole("button", { name: /Показать ещё/ })).toBeNull();
  });

  it("should show the page loading state and ignore clicks while it loads", async () => {
    const scope = createScope();
    void allSettled(incomeHistoryModel.loadNextPageFx, {
      scope,
      params: { ...APPLIED_RANGE, before: "2026-09-20", version: 1 },
    });
    const requested = watchNextPage(scope);
    renderHistory(scope);

    const button = screen.getByRole("button", { name: /Загружаем оплаты…/ });
    expect(button).toHaveAttribute("aria-busy", "true");

    await userEvent.click(button);

    expect(requested).not.toHaveBeenCalled();
  });

  it("should show the page error with «Повторить» and keep the shown days", async () => {
    const scope = createScope({ nextPageError: NEXT_PAGE_ERROR });
    const requested = watchNextPage(scope);
    renderHistory(scope);

    const alert = screen.getByText(NEXT_PAGE_ERROR).closest("[role='alert']") as HTMLElement;
    expect(alert).not.toBeNull();
    expect(screen.getByLabelText(/^Пятница, 25 сентября/)).toBeInTheDocument();

    await userEvent.click(within(alert).getByRole("button", { name: "Повторить" }));

    expect(requested).toHaveBeenCalledTimes(1);
  });
});
