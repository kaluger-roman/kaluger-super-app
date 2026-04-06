import prisma from "../lib/prisma";
import {
  comparePassword,
  hashPassword,
  validatePassword,
} from "../utils";

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw Object.assign(new Error("Пользователь не найден"), { statusCode: 404 });
  }

  const isPasswordValid = await comparePassword(currentPassword, user.password);
  if (!isPasswordValid) {
    throw Object.assign(new Error("Неверный текущий пароль"), { statusCode: 401 });
  }

  if (!validatePassword(newPassword)) {
    throw Object.assign(
      new Error("Пароль должен содержать минимум 8 символов, заглавные и строчные буквы и цифру"),
      { statusCode: 400 },
    );
  }

  const isSamePassword = await comparePassword(newPassword, user.password);
  if (isSamePassword) {
    throw Object.assign(new Error("Новый пароль должен отличаться от текущего"), { statusCode: 400 });
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
};
