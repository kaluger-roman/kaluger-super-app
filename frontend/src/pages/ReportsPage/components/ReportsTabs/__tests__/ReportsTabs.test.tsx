import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import type { Scope } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { afterEach, describe, it, expect, vi } from "vitest";

import { theme } from "@shared";

import { reportsTabsModel } from "../../../model";
import { ReportsTabs } from "../ReportsTabs";

const renderTabs = (scope: Scope) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <ReportsTabs />
      </ThemeProvider>
    </EffectorProvider>
  );

const mockScreenWidth = (isSmall: boolean) => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: isSmall && query.includes("max-width"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
};

describe("ReportsTabs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should show both tabs with the active one from the store", () => {
    renderTabs(fork({ values: [[reportsTabsModel.$activeTab, "history"]] }));

    expect(screen.getByRole("tab", { name: "Сводка" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "История поступлений" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("should point every tab at its panel", () => {
    renderTabs(fork());

    expect(screen.getByRole("tab", { name: "Сводка" })).toHaveAttribute(
      "aria-controls",
      "reports-tabpanel-summary"
    );
    expect(screen.getByRole("tab", { name: "История поступлений" })).toHaveAttribute(
      "aria-controls",
      "reports-tabpanel-history"
    );
  });

  it("should switch the tab in the store without touching the URL", async () => {
    const scope = fork();
    const searchBefore = window.location.search;
    renderTabs(scope);

    await userEvent.click(screen.getByRole("tab", { name: "История поступлений" }));

    expect(scope.getState(reportsTabsModel.$activeTab)).toBe("history");
    expect(screen.getByRole("tab", { name: "История поступлений" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(window.location.search).toBe(searchBefore);
  });

  it("should stretch the tabs on a small screen", () => {
    mockScreenWidth(true);
    renderTabs(fork());

    expect(screen.getByRole("tab", { name: "Сводка" })).toHaveClass("MuiTab-fullWidth");
  });

  it("should not stretch the tabs on a wide screen", () => {
    mockScreenWidth(false);
    renderTabs(fork());

    expect(screen.getByRole("tab", { name: "Сводка" })).not.toHaveClass("MuiTab-fullWidth");
  });
});
