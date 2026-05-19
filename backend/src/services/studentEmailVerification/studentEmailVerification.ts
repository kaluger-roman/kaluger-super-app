import prisma from "../../lib/prisma";
import {
  MAX_VERIFICATION_ATTEMPTS,
  RESEND_COOLDOWN_SECONDS,
  generateVerificationCode,
  getVerificationCodeExpiry,
  isVerificationCodeExpired,
  isWithinResendCooldown,
} from "../../utils/verification";
import { sendStudentVerificationEmail } from "../email";
import type {
  ResendResult,
  SendCodeResult,
  VerifyCodeResult,
} from "./studentEmailVerification.types";

export const issueAndSendStudentVerificationCode = async (
  studentUserId: string
): Promise<SendCodeResult> => {
  const studentUser = await prisma.studentUser.findUnique({
    where: { id: studentUserId },
  });
  if (!studentUser) return { ok: false, reason: "already_verified" };
  if (studentUser.isEmailVerified)
    return { ok: false, reason: "already_verified" };

  const verificationCode = generateVerificationCode();
  const verificationCodeExpiry = getVerificationCodeExpiry();

  await prisma.studentUser.update({
    where: { id: studentUserId },
    data: {
      verificationCode,
      verificationCodeExpiry,
      verificationCodeSentAt: new Date(),
      verificationAttempts: 0,
    },
  });

  try {
    await sendStudentVerificationEmail(studentUser.email, verificationCode);
    return { ok: true };
  } catch (error) {
    console.error("Error sending student verification email:", error);
    return { ok: false, reason: "send_failed" };
  }
};

export const verifyStudentEmailCode = async (
  studentUserId: string,
  code: string
): Promise<VerifyCodeResult> => {
  const studentUser = await prisma.studentUser.findUnique({
    where: { id: studentUserId },
  });
  if (!studentUser) return { ok: false, reason: "already_verified" };
  if (studentUser.isEmailVerified)
    return { ok: false, reason: "already_verified" };

  if (
    !studentUser.verificationCode ||
    !studentUser.verificationCodeExpiry
  ) {
    return { ok: false, reason: "no_active_code" };
  }

  if (isVerificationCodeExpired(studentUser.verificationCodeExpiry)) {
    return { ok: false, reason: "expired" };
  }

  if (studentUser.verificationCode !== code) {
    const attempts = studentUser.verificationAttempts + 1;

    if (attempts >= MAX_VERIFICATION_ATTEMPTS) {
      await prisma.studentUser.update({
        where: { id: studentUser.id },
        data: {
          verificationCode: null,
          verificationCodeExpiry: null,
          verificationCodeSentAt: null,
          verificationAttempts: 0,
        },
      });
      return { ok: false, reason: "attempts_exceeded" };
    }

    await prisma.studentUser.update({
      where: { id: studentUser.id },
      data: { verificationAttempts: attempts },
    });
    return { ok: false, reason: "wrong_code" };
  }

  await prisma.studentUser.update({
    where: { id: studentUser.id },
    data: {
      isEmailVerified: true,
      verificationCode: null,
      verificationCodeExpiry: null,
      verificationCodeSentAt: null,
      verificationAttempts: 0,
    },
  });

  return { ok: true };
};

export const resendStudentVerificationCode = async (
  studentUserId: string
): Promise<ResendResult> => {
  const studentUser = await prisma.studentUser.findUnique({
    where: { id: studentUserId },
  });
  if (!studentUser) return { ok: false, reason: "already_verified" };
  if (studentUser.isEmailVerified)
    return { ok: false, reason: "already_verified" };

  if (isWithinResendCooldown(studentUser.verificationCodeSentAt)) {
    const elapsedMs = studentUser.verificationCodeSentAt
      ? Date.now() - studentUser.verificationCodeSentAt.getTime()
      : 0;
    const retryAfterSeconds = Math.max(
      1,
      RESEND_COOLDOWN_SECONDS - Math.floor(elapsedMs / 1000)
    );
    return { ok: false, reason: "cooldown", retryAfterSeconds };
  }

  return issueAndSendStudentVerificationCode(studentUserId).then((result) =>
    result.ok ? { ok: true } : { ok: false, reason: result.reason }
  );
};
