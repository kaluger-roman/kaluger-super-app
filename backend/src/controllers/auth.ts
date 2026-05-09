import { Request, Response } from "express";
import {
  hashPassword,
  comparePassword,
  generateToken,
  validateEmail,
  validatePassword,
  generateVerificationCode,
  getVerificationCodeExpiry,
  normalizeEmail,
} from "../utils";
import { CreateUserDto, LoginDto } from "../types";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import { sendVerificationEmail } from "../services";

export const register = async (
  req: Request<{}, {}, CreateUserDto>,
  res: Response,
) => {
  try {
    const { email: rawEmail, password, name } = req.body;

    // Validation
    if (!rawEmail || !password || !name) {
      return res
        .status(400)
        .json({ error: "Email, пароль и имя обязательны для заполнения" });
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

    const email = normalizeEmail(rawEmail);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: "Пользователь уже существует" });
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const verificationCode = generateVerificationCode();
    const verificationCodeExpiry = getVerificationCodeExpiry();

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        verificationCode,
        verificationCodeExpiry,
        verificationCodeSentAt: new Date(),
        verificationAttempts: 0,
        isEmailVerified: false,
      },
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationCode);
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
      // Продолжаем даже если письмо не отправилось
    }

    res.status(201).json({
      message:
        "Пользователь успешно создан. Проверьте email для подтверждения регистрации",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified,
        taxEnabled: user.taxEnabled,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const login = async (req: Request<{}, {}, LoginDto>, res: Response) => {
  try {
    const { email: rawEmail, password } = req.body;

    // Validation
    if (!rawEmail || !password) {
      return res
        .status(400)
        .json({ error: "Email и пароль обязательны для заполнения" });
    }

    const email = normalizeEmail(rawEmail);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: "Неверные учетные данные" });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Неверные учетные данные" });
    }

    // Check email verification
    if (!user.isEmailVerified) {
      return res.status(403).json({
        error:
          "Email не подтвержден. Проверьте почту или запросите новый код подтверждения",
      });
    }

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email });

    res.json({
      message: "Вход выполнен успешно",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified,
        taxEnabled: user.taxEnabled,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        isEmailVerified: true,
        taxEnabled: true,
      },
    });

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
    const userId = req.user?.userId;
    const { name, taxEnabled } = req.body;

    if (name !== undefined && (!name || name.trim().length === 0)) {
      return res.status(400).json({ error: "Имя не может быть пустым" });
    }

    if (taxEnabled !== undefined && typeof taxEnabled !== "boolean") {
      return res
        .status(400)
        .json({ error: "Поле taxEnabled должно быть булевым" });
    }

    const data: { name?: string; taxEnabled?: boolean } = {};
    if (name !== undefined) data.name = name.trim();
    if (taxEnabled !== undefined) data.taxEnabled = taxEnabled;

    const result = await prisma.$transaction(async (tx) => {
      if (taxEnabled === true) {
        const periodsCount = await tx.taxRatePeriod.count({
          where: { userId },
        });
        if (periodsCount === 0) {
          return {
            error: "Чтобы включить учёт налога, добавьте хотя бы один период",
          };
        }
      }

      const user = await tx.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          isEmailVerified: true,
          taxEnabled: true,
        },
      });
      return { user };
    });

    if ("error" in result) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: "Профиль успешно обновлен", user: result.user });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
