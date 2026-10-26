import { createHmac } from "crypto";
import { prisma } from "../../lib/prisma";
import { CallAuthorizationError } from "../../utils";
import { CALL_LESSON_SELECT } from "../callRecord";
import type { CallLesson } from "../callRecord";
import { CALL_LESSON_NOT_FOUND_MESSAGE } from "./callSignaling.constants";
import type { CallStatus } from "@prisma/client";
import type { CallSignalingOutbound } from "../../types";
import type {
  CallDropOutcome,
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
      tutor: { select: { name: true } },
      studentUser: { select: { id: true } },
    },
  });

  if (!student || student.tutorId !== tutorUserId) {
    throw new CallAuthorizationError();
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
          tutor: { select: { name: true } },
        },
      },
    },
  });

  if (!studentUser?.student) {
    throw new CallAuthorizationError();
  }

  return {
    tutorUserId: studentUser.student.tutorId,
    studentUserId: studentUser.id,
    studentId: studentUser.student.id,
    studentName: studentUser.student.name,
    tutorName: studentUser.student.tutor.name,
  };
};

// Lesson status and time are not checked: a lesson call is allowed at any time.
export const resolveCallLesson = async (
  pair: ResolvedPair,
  lessonId: string
): Promise<CallLesson> => {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, tutorId: pair.tutorUserId, studentId: pair.studentId },
    select: CALL_LESSON_SELECT,
  });
  if (!lesson) throw new CallAuthorizationError(CALL_LESSON_NOT_FOUND_MESSAGE);
  return lesson;
};

export const resolveHangupStatus = (call: LiveCall): CallStatus =>
  call.status === "connected" ? "COMPLETED" : "FAILED";

export const resolveDropOutcome = (call: LiveCall, dropped: CallParticipant): CallDropOutcome => {
  if (call.status === "connected") return { status: "COMPLETED", peerMessage: "call_ended" };
  if (call.status === "accepted") return { status: "FAILED", peerMessage: "call_ended" };
  if (dropped.kind === call.callerKind) return { status: "CANCELED", peerMessage: "call_canceled" };
  return { status: "MISSED", peerMessage: "call_unavailable" };
};

export const toDropPeerMessage = (
  outcome: CallDropOutcome,
  callId: string
): CallSignalingOutbound => {
  if (outcome.peerMessage === "call_unavailable") {
    return { type: "call_unavailable", reason: "offline", callId };
  }
  if (outcome.peerMessage === "call_canceled") {
    return { type: "call_canceled", callId, reason: "canceled" };
  }
  return { type: "call_ended", callId, reason: "peer_disconnected" };
};

export const isSamePair = (call: LiveCall, pair: ResolvedPair): boolean =>
  call.tutorUserId === pair.tutorUserId && call.studentUserId === pair.studentUserId;

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
