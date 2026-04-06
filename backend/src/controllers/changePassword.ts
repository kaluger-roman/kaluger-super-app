import { Response } from "express";

import type { AuthRequest } from "../middleware/auth";
import { changePassword as changePasswordService } from "../services";
import type { ChangePasswordDto } from "../types";

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword, confirmPassword } =
      req.body as ChangePasswordDto;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ error: "Все поля обязательны для заполнения" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Пароли не совпадают" });
    }

    await changePasswordService(userId!, currentPassword, newPassword);

    res.json({ message: "Пароль успешно изменён" });
  } catch (error) {
    const err = error as Error & { statusCode?: number };
    console.error("Change password error:", error);

    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    res.status(500).json({ error: "Ошибка при смене пароля" });
  }
};
