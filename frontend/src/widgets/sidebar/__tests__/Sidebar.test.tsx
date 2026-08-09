import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

import { theme } from "@shared";

import { Sidebar } from "../Sidebar";

const renderSidebar = () =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <Sidebar drawerWidth={240} open onClose={() => undefined} />
      </ThemeProvider>
    </MemoryRouter>
  );

describe("Sidebar", () => {
  it("should render navigation items", () => {
    renderSidebar();

    expect(screen.getByText("Главная")).toBeInTheDocument();
    expect(screen.getByText("Ученики")).toBeInTheDocument();
    expect(screen.getByText("Уроки")).toBeInTheDocument();
  });

  it("should not leak $drawerWidth prop to the DOM", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    renderSidebar();

    const leaked = Array.from(document.body.querySelectorAll("*")).some((el) =>
      el
        .getAttributeNames()
        .some((name: string) => name.toLowerCase().includes("drawerwidth"))
    );
    expect(leaked).toBe(false);
    expect(
      errorSpy.mock.calls.some((args) => String(args[0]).includes("drawerWidth"))
    ).toBe(false);

    errorSpy.mockRestore();
  });
});
