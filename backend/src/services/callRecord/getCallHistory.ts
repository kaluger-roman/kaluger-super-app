import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import type { CallHistoryItem } from "../../types";
import { CALL_RECORD_WITH_PEER } from "./callRecord.constants";
import {
  clampLimit,
  toCallHistoryItemForStudent,
  toCallHistoryItemForTutor,
} from "./callRecord.helpers";
import type { CallHistoryQuery, CallRecordWithPeer } from "./callRecord.types";

const queryRecords = async (
  where: Prisma.CallRecordWhereInput,
  query: CallHistoryQuery
): Promise<CallRecordWithPeer[]> => {
  const take = clampLimit(query.limit);
  return prisma.callRecord.findMany({
    where,
    include: CALL_RECORD_WITH_PEER.include,
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

  const records = await queryRecords({ studentId: studentUser.studentId }, query);
  return records.map(toCallHistoryItemForStudent);
};
