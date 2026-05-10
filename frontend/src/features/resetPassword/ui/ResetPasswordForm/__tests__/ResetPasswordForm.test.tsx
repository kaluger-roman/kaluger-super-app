/* eslint-disable import/order */
import { ThemeProvider } from "@mui/material";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";

import { authApi, theme } from "@shared";

import { ResetPasswordForm } from "../ResetPasswordForm";

vi.mock("@shared", async () => {
  const actual = await vi.importActual<typeof import("@shared")>("@shared");
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      verifyResetToken: vi.fn(),
      resetPassword: vi.fn(),
    },
  };
});

const renderForm = (token: string, scope = fork()) =>
  render(
    <EffectorProvider value={scope}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <ResetPasswordForm token={token} />
        </ThemeProvider>
      </BrowserRouter>
    </EffectorProvider>,
  );

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show password fields when token is valid", async () => {
    vi.mocked(authApi.verifyResetToken).mockResolvedValueOnce({ valid: true });

    renderForm("valid-token");

    expect(await screen.findByLabelText(/Новый пароль/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Подтверждение пароля/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeInTheDocument();
  });

  it("should show invalid_expired alert and request-new-link button when token is expired", async () => {
    vi.mocked(authApi.verifyResetToken).mockRejectedValueOnce({
      response: { data: { error: "Срок действия ссылки истёк. Запросите новую" } },
    });

    renderForm("expired-token");

    await waitFor(() => {
      expect(screen.getByText(/истёк/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "Запросить новую ссылку" })).toBeInTheDocument();
  });

  it("should show invalid_used alert when token has already been used", async () => {
    vi.mocked(authApi.verifyResetToken).mockRejectedValueOnce({
      response: { data: { error: "Эта ссылка уже была использована. Запросите новую" } },
    });

    renderForm("used-token");

    await waitFor(() => {
      expect(screen.getByText(/уже была использована/i)).toBeInTheDocument();
    });
  });

  it("should show generic invalid_unknown alert for unknown token error", async () => {
    vi.mocked(authApi.verifyResetToken).mockRejectedValueOnce({
      response: { data: { error: "Ссылка для сброса пароля недействительна" } },
    });

    renderForm("bad-token");

    await waitFor(() => {
      expect(screen.getByText(/недействительна/i)).toBeInTheDocument();
    });
  });

  it("should show mismatch error when passwords do not match", async () => {
    vi.mocked(authApi.verifyResetToken).mockResolvedValueOnce({ valid: true });
    const user = userEvent.setup();

    renderForm("valid-token");

    const newPasswordField = await screen.findByLabelText(/Новый пароль/i);

    await user.type(newPasswordField, "NewPass1");
    await user.type(screen.getByLabelText(/Подтверждение пароля/i), "Different1");

    expect(screen.getByText("Пароли не совпадают")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
  });

  it("should call authApi.resetPassword with token and passwords on submit", async () => {
    vi.mocked(authApi.verifyResetToken).mockResolvedValueOnce({ valid: true });
    vi.mocked(authApi.resetPassword).mockResolvedValueOnce({ message: "ok" });
    const user = userEvent.setup();

    renderForm("valid-token");

    const newPasswordField = await screen.findByLabelText(/Новый пароль/i);
    await user.type(newPasswordField, "NewPass1");
    await user.type(screen.getByLabelText(/Подтверждение пароля/i), "NewPass1");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() => {
      expect(authApi.resetPassword).toHaveBeenCalledWith({
        token: "valid-token",
        newPassword: "NewPass1",
        confirmPassword: "NewPass1",
      });
    });
  });

  it("should show success state with login button after successful reset", async () => {
    vi.mocked(authApi.verifyResetToken).mockResolvedValueOnce({ valid: true });
    vi.mocked(authApi.resetPassword).mockResolvedValueOnce({ message: "Пароль успешно изменён" });
    const user = userEvent.setup();

    renderForm("valid-token");

    const newPasswordField = await screen.findByLabelText(/Новый пароль/i);
    await user.type(newPasswordField, "NewPass1");
    await user.type(screen.getByLabelText(/Подтверждение пароля/i), "NewPass1");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(await screen.findByText("Пароль успешно изменён")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Войти с новым паролем" })).toBeInTheDocument();
  });

  it("should show api error alert when reset fails", async () => {
    vi.mocked(authApi.verifyResetToken).mockResolvedValueOnce({ valid: true });
    vi.mocked(authApi.resetPassword).mockRejectedValueOnce({
      response: { data: { error: "Новый пароль должен отличаться от текущего" } },
    });
    const user = userEvent.setup();

    renderForm("valid-token");

    const newPasswordField = await screen.findByLabelText(/Новый пароль/i);
    await user.type(newPasswordField, "NewPass1");
    await user.type(screen.getByLabelText(/Подтверждение пароля/i), "NewPass1");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(
      await screen.findByText("Новый пароль должен отличаться от текущего"),
    ).toBeInTheDocument();
  });
});
