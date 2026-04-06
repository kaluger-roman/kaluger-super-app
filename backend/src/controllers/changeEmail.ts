import { Response } from "express";

import { AuthRequest } from "../middleware/auth";
import {
  initiateEmailChange,
  verifyEmailChange,
  resendEmailChangeCode,
} from "../services";
import type { ChangeEmailDto, VerifyEmailChangeDto } from "../types";

export const changeEmail = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { newEmail, password } = req.body as ChangeEmailDto;

    if (!newEmail || !password) {
      return res
        .status(400)
        .json({ error: "Все поля обязательны для заполнения" });
    }

    await initiateEmailChange(userId!, newEmail, password);

    res.json({ message: "Код верификации отправлен на новый email" });
  } catch (error) {
    const err = error as Error & { statusCode?: number };
    console.error("Change email error:", error);

    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    res.status(500).json({ error: "Ошибка при инициировании смены email" });
  }
};

export const verifyEmailChangeController = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { code } = req.body as VerifyEmailChangeDto;

    if (!code) {
      return res.status(400).json({ error: "Код верификации обязателен" });
    }

    const result = await verifyEmailChange(userId!, code);

    res.json({
      message: "Email успешно изменён",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    const err = error as Error & { statusCode?: number };
    console.error("Verify email change error:", error);

    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    res.status(500).json({ error: "Ошибка при подтверждении смены email" });
  }
};

export const resendEmailChangeCodeController = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    await resendEmailChangeCode(userId!);

    res.json({ message: "Код верификации повторно отправлен" });
  } catch (error) {
    const err = error as Error & { statusCode?: number };
    console.error("Resend email change code error:", error);

    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    res.status(500).json({ error: "Ошибка при отправке кода" });
  }
};
