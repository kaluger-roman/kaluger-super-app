import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { theme } from "@shared";

import { IncomeHistoryEmpty } from "../IncomeHistoryEmpty";

describe("IncomeHistoryEmpty", () => {
  it("should explain that there are no payments in the period", () => {
    render(
      <ThemeProvider theme={theme}>
        <IncomeHistoryEmpty />
      </ThemeProvider>
    );

    expect(screen.getByText("За выбранный период поступлений нет")).toBeInTheDocument();
    expect(screen.getByText(/Выберите другой период и нажмите «Обновить»/)).toBeInTheDocument();
  });
});
