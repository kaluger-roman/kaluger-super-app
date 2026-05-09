/* eslint-disable import/order */
import { ThemeProvider } from "@mui/material";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";

import { authApi, theme } from "@shared";

import { forgotPasswordModel } from "../../../models";
import { ForgotPasswordForm } from "../ForgotPasswordForm";

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

const renderForm = (scope: ReturnType<typeof fork>) =>
  render(
    <EffectorProvider value={scope}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <ForgotPasswordForm />
        </ThemeProvider>
      </BrowserRouter>
    </EffectorProvider>,
  );

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render email field, submit button and back-to-login link", () => {
    renderForm(fork());

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Отправить" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Вернуться ко входу" })).toBeInTheDocument();
  });

  it("should disable submit button when email is empty", () => {
    renderForm(fork());

    const button = screen.getByRole("button", { name: "Отправить" });
    expect(button).toBeDisabled();
  });

  it("should call authApi.forgotPassword with the entered email on submit", async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValueOnce({ message: "ok" });
    const user = userEvent.setup();
    renderForm(fork());

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Отправить" }));

    await waitFor(() => {
      expect(authApi.forgotPassword).toHaveBeenCalledWith({ email: "user@example.com" });
    });
  });

  it("should show neutral success message after submit and hide the form", async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValueOnce({
      message: "Если адрес зарегистрирован, мы отправили на него письмо со ссылкой для сброса пароля",
    });
    const user = userEvent.setup();
    renderForm(fork());

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Отправить" }));

    await waitFor(() => {
      expect(
        screen.getByText(/Если адрес зарегистрирован/i),
      ).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it("should show error alert when api fails", async () => {
    vi.mocked(authApi.forgotPassword).mockRejectedValueOnce({
      response: { data: { error: "Слишком много попыток. Попробуйте позже" } },
      message: "Network",
    });
    const user = userEvent.setup();
    renderForm(fork());

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Отправить" }));

    await waitFor(() => {
      expect(screen.getByText(/Слишком много попыток/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("should disable submit while api request is pending", async () => {
    let resolvePromise!: (value: { message: string }) => void;
    vi.mocked(authApi.forgotPassword).mockImplementationOnce(
      () =>
        new Promise<{ message: string }>((resolve) => {
          resolvePromise = resolve;
        }),
    );

    const user = userEvent.setup();
    renderForm(fork());

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Отправить" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Отправка..." })).toBeDisabled();
    });

    resolvePromise({ message: "ok" });
    await waitFor(() => {
      expect(forgotPasswordModel.$isLoading).toBeDefined();
    });
  });
});
