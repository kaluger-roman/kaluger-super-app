import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { theme } from "@shared";

import { IncomeHistoryLoadMore } from "../IncomeHistoryLoadMore";

const renderLoadMore = (props: {
  remainingCount?: number;
  isLoading?: boolean;
  error?: string | null;
  onLoadMore?: () => void;
}) =>
  render(
    <ThemeProvider theme={theme}>
      <IncomeHistoryLoadMore
        remainingCount={props.remainingCount ?? 12}
        isLoading={props.isLoading ?? false}
        error={props.error ?? null}
        onLoadMore={props.onLoadMore ?? vi.fn()}
      />
    </ThemeProvider>
  );

describe("IncomeHistoryLoadMore", () => {
  it("should render nothing when everything is loaded", () => {
    const { container } = renderLoadMore({ remainingCount: 0 });

    expect(container).toBeEmptyDOMElement();
  });

  it("should show the remaining count and load more on click", async () => {
    const onLoadMore = vi.fn();
    renderLoadMore({ onLoadMore });

    await userEvent.click(screen.getByRole("button", { name: "Показать ещё (осталось 12)" }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("should show the loading state and ignore clicks", async () => {
    const onLoadMore = vi.fn();
    renderLoadMore({ isLoading: true, onLoadMore });

    const button = screen.getByRole("button", { name: /Загружаем оплаты…/ });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");

    await userEvent.click(button);

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("should show the error with a retry button instead of «Показать ещё»", async () => {
    const onLoadMore = vi.fn();
    renderLoadMore({ error: "Не удалось загрузить следующие оплаты", onLoadMore });

    expect(screen.getByText("Не удалось загрузить следующие оплаты")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Показать ещё/ })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Повторить" }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
