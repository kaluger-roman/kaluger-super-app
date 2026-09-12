import type { Request, Response } from "express";
import {
  EmailNotVerifiedError,
  InvalidCredentialsError,
  normalizeEmail,
  TaxPeriodsRequiredError,
  UserAlreadyExistsError,
  validateEmail,
  validatePassword,
} from "../utils";
import type { CreateUserDto, LoginDto } from "../types";
import type { AuthRequest } from "../middleware/auth";
import { getUserProfile, loginUser, registerUser, updateUserProfile } from "../services";

export const register = async (
  req: Request<Record<string, never>, unknown, CreateUserDto>,
  res: Response
) => {
  try {
    const { email: rawEmail, password, name } = req.body;

    if (!rawEmail || !password || !name) {
      return res.status(400).json({ error: "Email, пароль и имя обязательны для заполнения" });
    }

    if (!validateEmail(rawEmail)) {
      return res.status(400).json({ error: "Неверный формат email" });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        error:
          "Пароль должен содержать минимум 8 символов, включая заглавные и строчные буквы, а также цифры",
      });
    }

    const user = await registerUser({
      email: normalizeEmail(rawEmail),
      password,
      name,
    });

    res.status(201).json({
      message: "Пользователь успешно создан. Проверьте email для подтверждения регистрации",
      user,
    });
  } catch (error) {
    if (error instanceof UserAlreadyExistsError) {
      return res.status(409).json({ error: error.message });
    }
    console.error("Registration error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const login = async (
  req: Request<Record<string, never>, unknown, LoginDto>,
  res: Response
) => {
  try {
    const { email: rawEmail, password } = req.body;

    if (!rawEmail || !password) {
      return res.status(400).json({ error: "Email и пароль обязательны для заполнения" });
    }

    const { token, user } = await loginUser({
      email: normalizeEmail(rawEmail),
      password,
    });

    res.json({ message: "Вход выполнен успешно", token, user });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return res.status(401).json({ error: error.message });
    }
    if (error instanceof EmailNotVerifiedError) {
      return res.status(403).json({ error: error.message });
    }
    console.error("Login error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await getUserProfile(req.user!.userId);

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, taxEnabled } = req.body;

    if (name !== undefined && (!name || name.trim().length === 0)) {
      return res.status(400).json({ error: "Имя не может быть пустым" });
    }

    if (taxEnabled !== undefined && typeof taxEnabled !== "boolean") {
      return res.status(400).json({ error: "Поле taxEnabled должно быть булевым" });
    }

    const user = await updateUserProfile(req.user!.userId, {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(taxEnabled !== undefined ? { taxEnabled } : {}),
    });

    res.json({ message: "Профиль успешно обновлен", user });
  } catch (error) {
    if (error instanceof TaxPeriodsRequiredError) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
