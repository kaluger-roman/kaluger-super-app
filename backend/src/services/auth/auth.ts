import { prisma } from "../../lib/prisma";
import {
  comparePassword,
  EmailNotVerifiedError,
  generateToken,
  generateVerificationCode,
  getVerificationCodeExpiry,
  hashPassword,
  InvalidCredentialsError,
  TaxPeriodsRequiredError,
  UserAlreadyExistsError,
} from "../../utils";
import { sendVerificationEmail } from "../email";
import { PROFILE_USER_SELECT, toPublicUser } from "./auth.helpers";
import type {
  LoginUserInput,
  LoginUserResult,
  ProfileUser,
  PublicUser,
  RegisterUserInput,
  UpdateProfileInput,
} from "./auth.types";

export const registerUser = async ({
  email,
  password,
  name,
}: RegisterUserInput): Promise<PublicUser> => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new UserAlreadyExistsError();
  }

  const verificationCode = generateVerificationCode();
  const user = await prisma.user.create({
    data: {
      email,
      password: await hashPassword(password),
      name,
      verificationCode,
      verificationCodeExpiry: getVerificationCodeExpiry(),
      verificationCodeSentAt: new Date(),
      verificationAttempts: 0,
      isEmailVerified: false,
    },
  });

  try {
    await sendVerificationEmail(email, verificationCode);
  } catch (emailError) {
    console.error("Error sending verification email:", emailError);
    // Регистрация считается успешной даже без письма — код можно запросить повторно
  }

  return toPublicUser(user);
};

export const loginUser = async ({ email, password }: LoginUserInput): Promise<LoginUserResult> => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new InvalidCredentialsError();
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new InvalidCredentialsError();
  }

  if (!user.isEmailVerified) {
    throw new EmailNotVerifiedError();
  }

  // tokenVersion в payload позволяет отозвать токены при смене пароля/email
  const token = generateToken({
    userId: user.id,
    email: user.email,
    tokenVersion: user.tokenVersion,
  });

  return { token, user: toPublicUser(user) };
};

export const getUserProfile = (userId: string): Promise<ProfileUser | null> =>
  prisma.user.findUnique({
    where: { id: userId },
    select: PROFILE_USER_SELECT,
  });

export const updateUserProfile = (
  userId: string,
  { name, taxEnabled }: UpdateProfileInput
): Promise<ProfileUser> =>
  prisma.$transaction(async (tx) => {
    if (taxEnabled === true) {
      const periodsCount = await tx.taxRatePeriod.count({ where: { userId } });
      if (periodsCount === 0) {
        throw new TaxPeriodsRequiredError();
      }
    }

    return tx.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(taxEnabled !== undefined ? { taxEnabled } : {}),
      },
      select: PROFILE_USER_SELECT,
    });
  });
