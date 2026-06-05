import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";
import type { CallHistoryItem } from "../../types";
import {
  toCallHistoryItemForStudent,
  toCallHistoryItemForTutor,
} from "./callRecord.helpers";
import type { CallHistoryQuery } from "./callRecord.types";
import { DEFAULT_HISTORY_LIMIT, MAX_HISTORY_LIMIT } from "./callRecord.constants";

const callRecordWithPeer = {
  include: { student: { select: { name: true } }, tutor: { select: { name: true } } },
} satisfies Prisma.CallRecordDefaultArgs;

type CallRecordWithPeer = Prisma.CallRecordGetPayload<typeof callRecordWithPeer>;

const clampLimit = (limit?: number): number => {
  if (!limit || limit <= 0) return DEFAULT_HISTORY_LIMIT;
  return Math.min(limit, MAX_HISTORY_LIMIT);
};

const queryRecords = async (
  where: Prisma.CallRecordWhereInput,
  query: CallHistoryQuery
): Promise<CallRecordWithPeer[]> => {
  const take = clampLimit(query.limit);
  return prisma.callRecord.findMany({
    where,
    include: callRecordWithPeer.include,
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    take,
  });
};

export const getCallHistoryForTutor = async (
  tutorUserId: string,
  query: CallHistoryQuery = {}
): Promise<CallHistoryItem[]> => {
  const records = await queryRecords({ tutorId: tutorUserId }, query);
  return records.map(toCallHistoryItemForTutor);
};

export const getCallHistoryForStudent = async (
  studentUserId: string,
  query: CallHistoryQuery = {}
): Promise<CallHistoryItem[]> => {
  const studentUser = await prisma.studentUser.findUnique({
    where: { id: studentUserId },
    select: { studentId: true },
  });
  if (!studentUser?.studentId) return [];

  const records = await queryRecords(
    { studentId: studentUser.studentId },
    query
  );
  return records.map(toCallHistoryItemForStudent);
};
