import prisma from "../lib/prisma";
import { setCachedTokenVersion } from "../lib/tokenVersionCache";
import {
  comparePassword,
  generateToken,
  hashPassword,
  validatePassword,
} from "../utils";

type ChangePasswordResult = {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    isEmailVerified: boolean;
    taxEnabled: boolean;
  };
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw Object.assign(new Error("Пользователь не найден"), { statusCode: 404 });
  }

  const isPasswordValid = await comparePassword(currentPassword, user.password);
  if (!isPasswordValid) {
    throw Object.assign(new Error("Неверный текущий пароль"), { statusCode: 400 });
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

  // Increment tokenVersion to revoke all previously issued JWTs, then mint a
  // fresh JWT for the *current* session so the user is not silently logged out
  // on the next request. Returning the new token is the responsibility of the
  // caller (controller) — same pattern as verifyEmailChange in changeEmail.ts.
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      tokenVersion: { increment: 1 },
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      isEmailVerified: true,
      taxEnabled: true,
      tokenVersion: true,
    },
  });

  // Prime the token-version cache with the new value so the JWT we just
  // minted passes the next authenticateToken middleware check without an
  // extra DB roundtrip (and so stale cached old version cannot reject it).
  setCachedTokenVersion(updatedUser.id, updatedUser.tokenVersion);

  const token = generateToken({
    userId: updatedUser.id,
    email: updatedUser.email,
    tokenVersion: updatedUser.tokenVersion,
  });

  return {
    token,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      createdAt: updatedUser.createdAt,
      isEmailVerified: updatedUser.isEmailVerified,
      taxEnabled: updatedUser.taxEnabled,
    },
  };
};
