/* eslint-disable import/order */
import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";

import { theme } from "@shared";

import { ForgotPasswordPage } from "../ForgotPasswordPage";

vi.mock("@shared", async () => {
  const actual = await vi.importActual<typeof import("@shared")>("@shared");
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      forgotPassword: vi.fn(),
    },
  };
});

const renderPage = () =>
  render(
    <EffectorProvider value={fork()}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <ForgotPasswordPage />
        </ThemeProvider>
      </BrowserRouter>
    </EffectorProvider>,
  );

describe("ForgotPasswordPage", () => {
  it("should render the ForgotPasswordForm with email field and submit button", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Восстановление пароля" })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Отправить" })).toBeInTheDocument();
  });
});
