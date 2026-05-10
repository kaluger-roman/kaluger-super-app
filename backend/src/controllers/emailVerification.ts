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

// Generic error returned for verification failures that, if differentiated,
// would let an unauthenticated caller enumerate registered emails.
const INVALID_CODE_ERROR = "Неверный код подтверждения";

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

    // Collapse "user not found", "already verified", "code missing" and
    // "code expired" into the same generic 400 — distinct responses leaked
    // whether the email was registered.
    if (!user || user.isEmailVerified) {
      return res.status(400).json({ error: INVALID_CODE_ERROR });
    }

    if (!user.verificationCode || !user.verificationCodeExpiry) {
      return res.status(400).json({ error: INVALID_CODE_ERROR });
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
      return res.status(400).json({ error: INVALID_CODE_ERROR });
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
        taxEnabled: user.taxEnabled,
      },
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

// Always returned to the unauthenticated /resend-verification caller so the
// existence (and verification state) of an email cannot be enumerated.
const RESEND_NEUTRAL_RESPONSE = {
  message:
    "Если такой email зарегистрирован и не подтверждён, код отправлен повторно",
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

    if (!user || user.isEmailVerified) {
      // Same response shape as the success path. No DB write, no email sent —
      // we don't want to confirm to the caller whether the address exists.
      return res.json(RESEND_NEUTRAL_RESPONSE);
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

    res.json(RESEND_NEUTRAL_RESPONSE);
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
