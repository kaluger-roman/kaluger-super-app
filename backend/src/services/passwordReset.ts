import prisma from "../lib/prisma";
import {
  RESET_REQUEST_COOLDOWN_SECONDS,
  comparePassword,
  createResetToken,
  getResetTokenExpiry,
  hashPassword,
  hashResetToken,
  isResetTokenExpired,
  normalizeEmail,
  validatePassword,
} from "../utils";
import { sendPasswordResetEmail } from "./email";

const getFrontendUrl = (): string => {
  const url = process.env.FRONTEND_URL;
  if (!url) {
    throw new Error("FRONTEND_URL is not set");
  }
  return url.replace(/\/$/, "");
};

const buildResetUrl = (token: string): string =>
  `${getFrontendUrl()}/reset-password?token=${token}`;

const throwHttp = (message: string, statusCode: number): never => {
  throw Object.assign(new Error(message), { statusCode });
};

export const requestPasswordReset = async (rawEmail: string): Promise<void> => {
  const email = normalizeEmail(rawEmail);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const cooldownThreshold = new Date(
    Date.now() - RESET_REQUEST_COOLDOWN_SECONDS * 1000,
  );
  const recentToken = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, createdAt: { gte: cooldownThreshold } },
  });
  if (recentToken) return;

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const { token, tokenHash } = createResetToken();
  const expiresAt = getResetTokenExpiry();

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  try {
    await sendPasswordResetEmail(email, buildResetUrl(token));
  } catch (error) {
    console.error("Password reset email failed", { userId: user.id, error });
  }
};

const findValidResetToken = async (token: string) => {
  const tokenHash = hashResetToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!record) {
    throwHttp("Ссылка для сброса пароля недействительна", 400);
  }
  if (record!.usedAt !== null) {
    throwHttp("Эта ссылка уже была использована. Запросите новую", 400);
  }
  if (isResetTokenExpired(record!.expiresAt)) {
    throwHttp("Срок действия ссылки истёк. Запросите новую", 400);
  }
  return record!;
};

export const verifyResetToken = async (token: string): Promise<void> => {
  if (!token) {
    throwHttp("Токен обязателен", 400);
  }
  await findValidResetToken(token);
};

export const applyPasswordReset = async (
  token: string,
  newPassword: string,
  confirmPassword: string,
): Promise<void> => {
  if (!token || !newPassword || !confirmPassword) {
    throwHttp("Все поля обязательны для заполнения", 400);
  }
  if (newPassword !== confirmPassword) {
    throwHttp("Пароли не совпадают", 400);
  }
  if (!validatePassword(newPassword)) {
    throwHttp(
      "Пароль должен содержать минимум 8 символов, заглавные и строчные буквы и цифру",
      400,
    );
  }

  const record = await findValidResetToken(token);

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) {
    throwHttp("Пользователь не найден", 404);
  }

  const isSamePassword = await comparePassword(newPassword, user!.password);
  if (isSamePassword) {
    throwHttp("Новый пароль должен отличаться от текущего", 400);
  }

  const hashedPassword = await hashPassword(newPassword);
  const userUpdate: {
    password: string;
    isEmailVerified?: boolean;
    tokenVersion: { increment: number };
  } = {
    password: hashedPassword,
    tokenVersion: { increment: 1 },
  };
  if (!user!.isEmailVerified) {
    userUpdate.isEmailVerified = true;
  }

  // Атомарная проверка-и-применение: updateMany по (id, usedAt=null)
  // гарантирует, что параллельный запрос с тем же токеном не сможет
  // дважды применить смену пароля. Если токен уже помечен — count=0 и
  // транзакция откатывается без изменения пользователя.
  await prisma.$transaction(async (tx) => {
    const result = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (result.count === 0) {
      throwHttp("Эта ссылка уже была использована. Запросите новую", 400);
    }
    await tx.user.update({
      where: { id: user!.id },
      data: userUpdate,
    });
  });
};
