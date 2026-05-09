import type { Request, Response } from "express";
import {
  MAX_VERIFICATION_ATTEMPTS,
  generateToken,
  generateVerificationCode,
  getVerificationCodeExpiry,
  isVerificationCodeExpired,
  normalizeEmail,
} from "../utils";
import type { VerifyEmailDto, ResendVerificationDto } from "../types";
import prisma from "../lib/prisma";
import { sendVerificationEmail } from "../services";

export const verifyEmail = async (
  req: Request<{}, {}, VerifyEmailDto>,
  res: Response,
) => {
  try {
    const { email: rawEmail, code } = req.body;

    if (!rawEmail || !code) {
      return res
        .status(400)
        .json({ error: "Email и код подтверждения обязательны" });
    }

    const email = normalizeEmail(rawEmail);

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
      const attempts = user.verificationAttempts + 1;

      if (attempts >= MAX_VERIFICATION_ATTEMPTS) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            verificationCode: null,
            verificationCodeExpiry: null,
            verificationCodeSentAt: null,
            verificationAttempts: 0,
          },
        });
        return res.status(400).json({
          error: "Превышено количество попыток. Запросите новый код",
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { verificationAttempts: attempts },
      });
      return res.status(400).json({ error: "Неверный код подтверждения" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationCode: null,
        verificationCodeExpiry: null,
        verificationCodeSentAt: null,
        verificationAttempts: 0,
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
        taxRate: user.taxRate,
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
    const { email: rawEmail } = req.body;

    if (!rawEmail) {
      return res.status(400).json({ error: "Email обязателен" });
    }

    const email = normalizeEmail(rawEmail);

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
        verificationCodeSentAt: new Date(),
        verificationAttempts: 0,
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
