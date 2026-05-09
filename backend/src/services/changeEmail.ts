import prisma from "../lib/prisma";
import type { VerifyEmailChangeResult } from "../types";
import {
  MAX_VERIFICATION_ATTEMPTS,
  comparePassword,
  validateEmail,
  generateVerificationCode,
  getVerificationCodeExpiry,
  isVerificationCodeExpired,
  isWithinResendCooldown,
  generateToken,
  normalizeEmail,
} from "../utils";
import { sendEmailChangeVerification } from "./email";

export const initiateEmailChange = async (
  userId: string,
  rawNewEmail: string,
  password: string,
): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw Object.assign(new Error("Пользователь не найден"), { statusCode: 404 });
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw Object.assign(new Error("Неверный пароль"), { statusCode: 400 });
  }

  if (!validateEmail(rawNewEmail)) {
    throw Object.assign(new Error("Некорректный формат email"), { statusCode: 400 });
  }

  const newEmail = normalizeEmail(rawNewEmail);

  if (!user.isEmailVerified) {
    throw Object.assign(new Error("Сначала подтвердите текущий email"), { statusCode: 400 });
  }

  if (newEmail === user.email) {
    throw Object.assign(new Error("Новый email должен отличаться от текущего"), { statusCode: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: newEmail },
  });

  if (existingUser) {
    throw Object.assign(new Error("Этот email уже используется"), { statusCode: 409 });
  }

  const verificationCode = generateVerificationCode();
  const verificationCodeExpiry = getVerificationCodeExpiry();

  await prisma.user.update({
    where: { id: userId },
    data: {
      pendingEmail: newEmail,
      verificationCode,
      verificationCodeExpiry,
      verificationCodeSentAt: new Date(),
      verificationAttempts: 0,
    },
  });

  try {
    await sendEmailChangeVerification(newEmail, verificationCode);
  } catch (emailError) {
    console.error("Error sending email change verification:", emailError);
    throw Object.assign(new Error("Ошибка при отправке кода верификации"), { statusCode: 500 });
  }
};

export const verifyEmailChange = async (
  userId: string,
  code: string,
): Promise<VerifyEmailChangeResult> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw Object.assign(new Error("Пользователь не найден"), { statusCode: 404 });
  }

  if (!user.pendingEmail) {
    throw Object.assign(new Error("Нет запроса на смену email"), { statusCode: 400 });
  }

  if (!user.verificationCode || !user.verificationCodeExpiry) {
    throw Object.assign(
      new Error("Код подтверждения не найден. Запросите новый код"),
      { statusCode: 400 },
    );
  }

  if (isVerificationCodeExpired(user.verificationCodeExpiry)) {
    throw Object.assign(new Error("Срок действия кода верификации истёк"), { statusCode: 400 });
  }

  if (user.verificationCode !== code) {
    const attempts = user.verificationAttempts + 1;

    if (attempts >= MAX_VERIFICATION_ATTEMPTS) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          verificationCode: null,
          verificationCodeExpiry: null,
          verificationCodeSentAt: null,
          verificationAttempts: 0,
        },
      });
      throw Object.assign(
        new Error("Превышено количество попыток. Запросите новый код"),
        { statusCode: 400 },
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { verificationAttempts: attempts },
    });
    throw Object.assign(new Error("Неверный код верификации"), { statusCode: 400 });
  }

  // Check email still available at verification time
  const existingUser = await prisma.user.findUnique({
    where: { email: user.pendingEmail },
  });

  if (existingUser) {
    throw Object.assign(new Error("Этот email уже используется"), { statusCode: 409 });
  }

  let updatedUser;
  try {
    updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        email: user.pendingEmail,
        pendingEmail: null,
        verificationCode: null,
        verificationCodeExpiry: null,
        verificationCodeSentAt: null,
        verificationAttempts: 0,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        isEmailVerified: true,
        taxEnabled: true,
      },
    });
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2002") {
      throw Object.assign(new Error("Этот email уже используется"), { statusCode: 409 });
    }
    throw error;
  }

  const token = generateToken({ userId: updatedUser.id, email: updatedUser.email });

  return { token, user: updatedUser };
};

export const resendEmailChangeCode = async (userId: string): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw Object.assign(new Error("Пользователь не найден"), { statusCode: 404 });
  }

  if (!user.pendingEmail) {
    throw Object.assign(new Error("Нет запроса на смену email"), { statusCode: 400 });
  }

  if (isWithinResendCooldown(user.verificationCodeSentAt)) {
    throw Object.assign(
      new Error("Подождите перед повторной отправкой кода"),
      { statusCode: 429 },
    );
  }

  const verificationCode = generateVerificationCode();
  const verificationCodeExpiry = getVerificationCodeExpiry();

  await prisma.user.update({
    where: { id: userId },
    data: {
      verificationCode,
      verificationCodeExpiry,
      verificationCodeSentAt: new Date(),
      verificationAttempts: 0,
    },
  });

  try {
    await sendEmailChangeVerification(user.pendingEmail, verificationCode);
  } catch (emailError) {
    console.error("Error resending email change verification:", emailError);
    throw Object.assign(new Error("Ошибка при отправке кода"), { statusCode: 500 });
  }
};
