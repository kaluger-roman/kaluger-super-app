import { createHmac } from "crypto";
import { prisma } from "../../lib/prisma";
import { CallAuthorizationError } from "../../utils";
import { ARCHIVED_STUDENT_CALL_MESSAGE } from "./callSignaling.constants";
import type {
  CallDropOutcome,
  CallFinalizeStatus,
  CallParticipant,
  LiveCall,
  ResolvedPair,
} from "./callSignaling.types";

export const resolvePairForTutor = async (
  tutorUserId: string,
  targetStudentId: string
): Promise<ResolvedPair> => {
  const student = await prisma.student.findUnique({
    where: { id: targetStudentId },
    select: {
      id: true,
      name: true,
      tutorId: true,
      archived: true,
      tutor: { select: { name: true } },
      studentUser: { select: { id: true } },
    },
  });

  if (!student || student.tutorId !== tutorUserId) {
    throw new CallAuthorizationError();
  }
  if (student.archived) {
    throw new CallAuthorizationError(ARCHIVED_STUDENT_CALL_MESSAGE);
  }
  if (!student.studentUser) {
    throw new CallAuthorizationError("У ученика нет кабинета для звонков");
  }

  return {
    tutorUserId,
    studentUserId: student.studentUser.id,
    studentId: student.id,
    studentName: student.name,
    tutorName: student.tutor.name,
  };
};

export const resolvePairForStudent = async (studentUserId: string): Promise<ResolvedPair> => {
  const studentUser = await prisma.studentUser.findUnique({
    where: { id: studentUserId },
    select: {
      id: true,
      studentId: true,
      student: {
        select: {
          id: true,
          name: true,
          tutorId: true,
          archived: true,
          tutor: { select: { name: true } },
        },
      },
    },
  });

  if (!studentUser?.student) {
    throw new CallAuthorizationError();
  }
  if (studentUser.student.archived) {
    throw new CallAuthorizationError(ARCHIVED_STUDENT_CALL_MESSAGE);
  }

  return {
    tutorUserId: studentUser.student.tutorId,
    studentUserId: studentUser.id,
    studentId: studentUser.student.id,
    studentName: studentUser.student.name,
    tutorName: studentUser.student.tutor.name,
  };
};

export const computeDurationSeconds = (
  status: CallFinalizeStatus,
  connectedAt?: Date,
  endedAt?: Date
): number | null => {
  if (status !== "COMPLETED" || !connectedAt || !endedAt) return null;
  return Math.max(0, Math.floor((endedAt.getTime() - connectedAt.getTime()) / 1000));
};

export const resolveHangupStatus = (call: LiveCall): CallFinalizeStatus =>
  call.status === "connected" ? "COMPLETED" : "FAILED";

export const resolveDropOutcome = (call: LiveCall, dropped: CallParticipant): CallDropOutcome => {
  if (call.status === "connected") return { status: "COMPLETED", peerMessage: "call_ended" };
  if (call.status === "accepted") return { status: "FAILED", peerMessage: "call_ended" };
  if (dropped.kind === call.callerKind) return { status: "CANCELED", peerMessage: "call_canceled" };
  return { status: "MISSED", peerMessage: "call_unavailable" };
};

export const mintTurnCredentials = (
  secret: string,
  ttlSeconds: number,
  participant: CallParticipant
): { username: string; credential: string } => {
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${expiry}:${participant.kind}-${participant.id}`;
  const credential = createHmac("sha1", secret).update(username).digest("base64");
  return { username, credential };
};
