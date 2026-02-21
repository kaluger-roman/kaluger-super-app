import { Request, Response } from "express";
import {
  generateToken,
  generateVerificationCode,
  getVerificationCodeExpiry,
  isVerificationCodeExpired,
} from "../utils";
import { VerifyEmailDto, ResendVerificationDto } from "../types";
import prisma from "../lib/prisma";
import { sendVerificationEmail } from "../services";

export const verifyEmail = async (
  req: Request<{}, {}, VerifyEmailDto>,
  res: Response,
) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res
        .status(400)
        .json({ error: "Email и код подтверждения обязательны" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: "Email уже подтвержден" });
    }

    if (!user.verificationCode || !user.verificationCodeExpiry) {
      return res
        .status(400)
        .json({ error: "Код подтверждения не найден. Запросите новый код" });
    }

    if (isVerificationCodeExpired(user.verificationCodeExpiry)) {
      return res.status(400).json({
        error: "Срок действия кода истек. Запросите новый код",
      });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ error: "Неверный код подтверждения" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationCode: null,
        verificationCodeExpiry: null,
      },
    });

    const token = generateToken({ userId: user.id, email: user.email });

    res.json({
      message: "Email успешно подтвержден",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: true,
      },
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const resendVerification = async (
  req: Request<{}, {}, ResendVerificationDto>,
  res: Response,
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email обязателен" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: "Email уже подтвержден" });
    }

    const verificationCode = generateVerificationCode();
    const verificationCodeExpiry = getVerificationCodeExpiry();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode,
        verificationCodeExpiry,
      },
    });

    try {
      await sendVerificationEmail(email, verificationCode);
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
      return res
        .status(500)
        .json({ error: "Ошибка отправки письма. Попробуйте позже" });
    }

    res.json({
      message: "Код подтверждения отправлен на email",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
