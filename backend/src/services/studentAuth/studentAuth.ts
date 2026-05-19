import { Prisma } from "@prisma/client";

import prisma from "../../lib/prisma";
import type {
  StudentLoginDto,
  StudentRegisterByInviteDto,
  StudentSettingsResponse,
} from "../../types";
import {
  comparePassword,
  hashPassword,
  normalizeEmail,
  validateEmail,
  validatePassword,
} from "../../utils/auth";
import { generateStudentToken } from "../../utils/studentAuth";
import {
  hashInvitationToken,
  isInvitationExpired,
} from "../../utils/studentInvitationToken";
import { issueAndSendStudentVerificationCode } from "../studentEmailVerification";
import {
  EMAIL_TAKEN_ERROR,
  INVALID_CREDENTIALS_ERROR,
  INVALID_LINK_ERROR,
  PASSWORD_POLICY_ERROR,
} from "./studentAuth.constants";
import { buildSettingsResponse } from "./studentAuth.helpers";
import type { LoginResult, RegisterResult } from "./studentAuth.types";

export const registerStudentByInvite = async (
  dto: StudentRegisterByInviteDto
): Promise<RegisterResult> => {
  if (!dto.token || !dto.name || !dto.email || !dto.password) {
    return {
      ok: false,
      status: 400,
      error: "Все поля обязательны для заполнения",
    };
  }

  const name = dto.name.trim();
  if (!name) {
    return { ok: false, status: 400, error: "ФИО не может быть пустым" };
  }

  if (!validateEmail(dto.email)) {
    return { ok: false, status: 400, error: "Неверный формат email" };
  }

  if (!validatePassword(dto.password)) {
    return { ok: false, status: 400, error: PASSWORD_POLICY_ERROR };
  }

  if (dto.password !== dto.passwordConfirmation) {
    return { ok: false, status: 400, error: "Пароли не совпадают" };
  }

  const email = normalizeEmail(dto.email);

  const tokenHash = hashInvitationToken(dto.token);
  const invitation = await prisma.studentInvitation.findUnique({
    where: { tokenHash },
    include: { student: { include: { studentUser: true } } },
  });

  if (
    !invitation ||
    invitation.status !== "PENDING" ||
    isInvitationExpired(invitation.expiresAt) ||
    invitation.student.studentUser
  ) {
    return { ok: false, status: 410, error: INVALID_LINK_ERROR };
  }

  const passwordHash = await hashPassword(dto.password);

  let createdStudentUser;
  try {
    createdStudentUser = await prisma.$transaction(async (tx) => {
      const studentUser = await tx.studentUser.create({
        data: {
          email,
          password: passwordHash,
          name,
          studentId: invitation.studentId,
        },
      });
      await tx.studentInvitation.update({
        where: { id: invitation.id },
        data: { status: "USED", usedAt: new Date() },
      });
      return studentUser;
    });
  } catch (err) {
    // Race condition: concurrent request with the same email passed the check
    // but lost the DB unique constraint. Map P2002 to the same 409 the caller
    // would have seen had it lost the original check.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { ok: false, status: 409, error: EMAIL_TAKEN_ERROR };
    }
    throw err;
  }

  // Fire-and-forget — отправка письма не должна откатывать регистрацию;
  // ученик увидит баннер "Подтвердите email" и сможет переотправить код.
  void issueAndSendStudentVerificationCode(createdStudentUser.id).catch(
    (error) => {
      console.error(
        "Failed to send initial student verification email:",
        error
      );
    }
  );

  const token = generateStudentToken({
    studentUserId: createdStudentUser.id,
    email: createdStudentUser.email,
    isStudent: true,
  });

  const tutorName = invitation.student.tutorId
    ? (
        await prisma.user.findUnique({
          where: { id: invitation.student.tutorId },
          select: { name: true },
        })
      )?.name ?? null
    : null;

  return {
    ok: true,
    data: {
      token,
      student: buildSettingsResponse(
        {
          id: createdStudentUser.id,
          email: createdStudentUser.email,
          name: createdStudentUser.name,
          isEmailVerified: createdStudentUser.isEmailVerified,
        },
        tutorName
      ),
    },
  };
};

export const loginStudent = async (
  dto: StudentLoginDto
): Promise<LoginResult> => {
  if (!dto.email || !dto.password) {
    return { ok: false, status: 400, error: "Email и пароль обязательны" };
  }

  const email = normalizeEmail(dto.email);
  const studentUser = await prisma.studentUser.findUnique({
    where: { email },
    include: { student: { include: { tutor: true } } },
  });

  if (!studentUser) {
    return { ok: false, status: 401, error: INVALID_CREDENTIALS_ERROR };
  }

  const passwordValid = await comparePassword(
    dto.password,
    studentUser.password
  );
  if (!passwordValid) {
    return { ok: false, status: 401, error: INVALID_CREDENTIALS_ERROR };
  }

  const token = generateStudentToken({
    studentUserId: studentUser.id,
    email: studentUser.email,
    isStudent: true,
  });

  return {
    ok: true,
    data: {
      token,
      student: buildSettingsResponse(
        {
          id: studentUser.id,
          email: studentUser.email,
          name: studentUser.name,
          isEmailVerified: studentUser.isEmailVerified,
        },
        studentUser.student?.tutor?.name ?? null
      ),
    },
  };
};

export const getStudentSettings = async (
  studentUserId: string
): Promise<StudentSettingsResponse | null> => {
  const studentUser = await prisma.studentUser.findUnique({
    where: { id: studentUserId },
    include: { student: { include: { tutor: true } } },
  });
  if (!studentUser) return null;

  return buildSettingsResponse(
    {
      id: studentUser.id,
      email: studentUser.email,
      name: studentUser.name,
      isEmailVerified: studentUser.isEmailVerified,
    },
    studentUser.student?.tutor?.name ?? null
  );
};
