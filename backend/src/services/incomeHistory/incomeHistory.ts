import { prisma } from "../../lib/prisma";
import type { IncomeHistoryDto } from "../../types";
import { loadStudentAllocations } from "../commission";
import { TAX_USER_SELECT, paidInRangeWhere } from "../statistics";
import { INCOME_HISTORY_LESSON_SELECT } from "./incomeHistory.constants";
import {
  buildIncomeHistoryContext,
  buildSummary,
  groupIntoDays,
  slicePage,
} from "./incomeHistory.helpers";
import type { IncomeHistoryInput } from "./incomeHistory.types";

export const collectIncomeHistory = async ({
  userId,
  range,
  timezone,
  before,
  through,
}: IncomeHistoryInput): Promise<IncomeHistoryDto> => {
  const [rows, user, allocations] = await Promise.all([
    prisma.lesson.findMany({
      where: paidInRangeWhere(userId, range),
      select: INCOME_HISTORY_LESSON_SELECT,
    }),
    prisma.user.findUnique({ where: { id: userId }, select: TAX_USER_SELECT }),
    loadStudentAllocations(userId),
  ]);
  const context = buildIncomeHistoryContext(user, allocations);
  const days = groupIntoDays(rows, timezone, context);

  return { summary: buildSummary(days, context), ...slicePage(days, { before, through }) };
};
