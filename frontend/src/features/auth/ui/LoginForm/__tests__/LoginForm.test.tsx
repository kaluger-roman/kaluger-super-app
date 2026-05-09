/* eslint-disable import/order */
import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";

import { theme } from "@shared";

import { LoginForm } from "../LoginForm";

vi.mock("@shared", async () => {
  const actual = await vi.importActual<typeof import("@shared")>("@shared");
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      login: vi.fn(),
    },
  };
});

const renderForm = () =>
  render(
    <EffectorProvider value={fork()}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <LoginForm />
        </ThemeProvider>
      </BrowserRouter>
    </EffectorProvider>,
  );

describe("LoginForm — forgot password link", () => {
  it("should render a 'Забыли пароль?' link pointing to /forgot-password", () => {
    renderForm();

    const link = screen.getByRole("link", { name: "Забыли пароль?" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/forgot-password");
  });
});
