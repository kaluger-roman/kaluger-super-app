import prisma from "../lib/prisma";
import {
  comparePassword,
  validateEmail,
  generateVerificationCode,
  getVerificationCodeExpiry,
  isVerificationCodeExpired,
  generateToken,
} from "../utils";
import { sendVerificationEmail } from "./email";

export const initiateEmailChange = async (
  userId: string,
  newEmail: string,
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
    throw Object.assign(new Error("Неверный пароль"), { statusCode: 401 });
  }

  if (!validateEmail(newEmail)) {
    throw Object.assign(new Error("Некорректный формат email"), { statusCode: 400 });
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
    },
  });

  try {
    await sendVerificationEmail(newEmail, verificationCode);
  } catch (emailError) {
    console.error("Error sending email change verification:", emailError);
    throw Object.assign(new Error("Ошибка при отправке кода верификации"), { statusCode: 500 });
  }
};

export const verifyEmailChange = async (
  userId: string,
  code: string,
): Promise<{ token: string; user: Record<string, unknown> }> => {
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
    throw Object.assign(new Error("Нет запроса на смену email"), { statusCode: 400 });
  }

  if (isVerificationCodeExpired(user.verificationCodeExpiry)) {
    throw Object.assign(new Error("Срок действия кода верификации истёк"), { statusCode: 400 });
  }

  if (user.verificationCode !== code) {
    throw Object.assign(new Error("Неверный код верификации"), { statusCode: 400 });
  }

  // Check email still available at verification time
  const existingUser = await prisma.user.findUnique({
    where: { email: user.pendingEmail },
  });

  if (existingUser) {
    throw Object.assign(new Error("Этот email уже используется"), { statusCode: 409 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      email: user.pendingEmail,
      pendingEmail: null,
      verificationCode: null,
      verificationCodeExpiry: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      isEmailVerified: true,
      taxRate: true,
    },
  });

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

  const verificationCode = generateVerificationCode();
  const verificationCodeExpiry = getVerificationCodeExpiry();

  await prisma.user.update({
    where: { id: userId },
    data: {
      verificationCode,
      verificationCodeExpiry,
    },
  });

  try {
    await sendVerificationEmail(user.pendingEmail, verificationCode);
  } catch (emailError) {
    console.error("Error resending email change verification:", emailError);
    throw Object.assign(new Error("Ошибка при отправке кода"), { statusCode: 500 });
  }
};
