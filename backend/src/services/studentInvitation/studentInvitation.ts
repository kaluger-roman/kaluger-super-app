import { Prisma } from "@prisma/client";

import prisma from "../../lib/prisma";
import type { TutorInvitationStatusResponse } from "../../types";
import {
  buildInviteUrl,
  createInvitationToken,
  getInvitationExpiry,
  hashInvitationToken,
  isInvitationExpired,
} from "../../utils/studentInvitationToken";
import type {
  IssueInvitationResult,
  RevokeInvitationResult,
  ValidateTokenResult,
} from "./studentInvitation.types";

export const issueInvitation = async (
  tutorId: string,
  studentId: string
): Promise<IssueInvitationResult> => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { studentUser: true },
  });
  if (!student) return { ok: false, reason: "student_not_found" };
  if (student.tutorId !== tutorId) return { ok: false, reason: "not_owner" };
  if (student.archived) return { ok: false, reason: "archived" };
  if (student.studentUser)
    return { ok: false, reason: "already_registered" };

  const { token, tokenHash } = createInvitationToken();
  const expiresAt = getInvitationExpiry();
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.studentInvitation.updateMany({
      where: { studentId, status: "PENDING" },
      data: { status: "REVOKED", revokedAt: now },
    });
    await tx.studentInvitation.create({
      data: { tokenHash, studentId, tutorId, expiresAt },
    });
  });

  return { ok: true, inviteUrl: buildInviteUrl(token), expiresAt };
};

export const getInvitationStatus = async (
  tutorId: string,
  studentId: string
): Promise<
  TutorInvitationStatusResponse | { error: "not_found" | "forbidden" }
> => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { studentUser: true },
  });
  if (!student) return { error: "not_found" };
  if (student.tutorId !== tutorId) return { error: "forbidden" };

  if (student.studentUser) {
    return {
      status: "registered",
      registeredAt: student.studentUser.createdAt.toISOString(),
      studentEmail: student.studentUser.email,
    };
  }

  const pending = await prisma.studentInvitation.findFirst({
    where: { studentId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  if (!pending || isInvitationExpired(pending.expiresAt)) {
    return { status: "not_issued" };
  }

  return {
    status: "pending",
    createdAt: pending.createdAt.toISOString(),
    expiresAt: pending.expiresAt.toISOString(),
  };
};

export const revokeInvitation = async (
  tutorId: string,
  studentId: string
): Promise<RevokeInvitationResult> => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, tutorId: true },
  });
  if (!student) return { ok: false, reason: "student_not_found" };
  if (student.tutorId !== tutorId) return { ok: false, reason: "not_owner" };

  const result = await prisma.studentInvitation.updateMany({
    where: { studentId, status: "PENDING" },
    data: { status: "REVOKED", revokedAt: new Date() },
  });

  return { ok: true, revoked: result.count > 0 };
};

export const validateRawToken = async (
  rawToken: string
): Promise<ValidateTokenResult> => {
  const tokenHash = hashInvitationToken(rawToken);
  const invitation = await prisma.studentInvitation.findUnique({
    where: { tokenHash },
    include: {
      student: { include: { tutor: true, studentUser: true } },
    },
  });

  if (!invitation) return { ok: false };
  if (invitation.status !== "PENDING") return { ok: false };
  if (isInvitationExpired(invitation.expiresAt)) return { ok: false };
  if (invitation.student.studentUser) return { ok: false };

  return {
    ok: true,
    invitation: {
      id: invitation.id,
      studentId: invitation.studentId,
      tutorId: invitation.tutorId,
    },
    studentName: invitation.student.name,
    tutorName: invitation.student.tutor.name,
  };
};

// Помечает invitation как USED в рамках уже открытой транзакции (для атомарной
// связки с созданием StudentUser в registerStudentByInvite).
export const markInvitationUsedInTx = async (
  tx: Prisma.TransactionClient,
  invitationId: string
): Promise<void> => {
  await tx.studentInvitation.update({
    where: { id: invitationId },
    data: { status: "USED", usedAt: new Date() },
  });
};
