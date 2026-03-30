import type { Request, Response } from "express";
import { comparePassword, validateEmail, generateAdminToken } from "../../utils/auth";
import type { AdminLoginDto } from "../../types";

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as AdminLoginDto;

    if (!email || !password) {
      return res.status(400).json({ error: "Email и пароль обязательны" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Некорректный формат email" });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHash = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPasswordHash) {
      return res.status(500).json({ error: "Админ не настроен" });
    }

    if (email !== adminEmail) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    const isPasswordValid = await comparePassword(password, adminPasswordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    const token = generateAdminToken({ email, isAdmin: true });

    res.json({ token });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ error: "Ошибка авторизации" });
  }
};
