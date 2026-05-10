import type { Request, Response } from "express";

import {
  applyPasswordReset,
  requestPasswordReset,
  verifyResetToken as verifyResetTokenService,
} from "../services";
import { validateEmail } from "../utils";
import type {
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyResetTokenDto,
} from "../types";

const NEUTRAL_FORGOT_PASSWORD_MESSAGE =
  "Если адрес зарегистрирован, мы отправили на него письмо со ссылкой для сброса пароля";

export const forgotPassword = async (
  req: Request<{}, {}, ForgotPasswordDto>,
  res: Response,
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email обязателен" });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Некорректный формат email" });
    }

    await requestPasswordReset(email);

    return res.json({ message: NEUTRAL_FORGOT_PASSWORD_MESSAGE });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res
      .status(500)
      .json({ error: "Ошибка при запросе восстановления пароля" });
  }
};

export const verifyResetToken = async (
  req: Request<{}, {}, VerifyResetTokenDto>,
  res: Response,
) => {
  try {
    const { token } = req.body;

    await verifyResetTokenService(token);

    return res.json({ valid: true });
  } catch (error) {
    const err = error as Error & { statusCode?: number };
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("Verify reset token error:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const resetPassword = async (
  req: Request<{}, {}, ResetPasswordDto>,
  res: Response,
) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    await applyPasswordReset(token, newPassword, confirmPassword);

    return res.json({ message: "Пароль успешно изменён" });
  } catch (error) {
    const err = error as Error & { statusCode?: number };
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Ошибка при смене пароля" });
  }
};
