import type { Request, Response } from "express";
import { comparePassword, generateAdminToken } from "../../utils/auth";
import type { AdminLoginDto } from "../../types";
import { validateAdminLoginDto } from "./validators";

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as AdminLoginDto;

    const errors = validateAdminLoginDto({ email, password });
    if (errors.length > 0) {
      return res.status(400).json({ error: errors[0] });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return res.status(500).json({ error: "Админ не настроен" });
    }

    if (email !== adminEmail) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    const isPasswordValid = password === adminPassword;

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
