import type {
  IncomeHistoryDayDto,
  IncomeHistoryEntryDto,
  IncomeHistorySummaryDto,
  IncomeHistoryTaxDto,
  TaxRatePeriodDto,
} from "../../types";
import { toDateKeyInTimezone } from "../../utils";
import type { StudentCommissionAllocation } from "../commission";
import type { TaxUser } from "../statistics";
import { toTaxPeriodDtos } from "../statistics";
import { resolveLessonTax } from "../taxRate";
import { INCOME_HISTORY_PAGE_SIZE } from "./incomeHistory.constants";
import type {
  IncomeHistoryContext,
  IncomeHistoryCursor,
  IncomeHistoryLessonRow,
  IncomeHistorySlice,
} from "./incomeHistory.types";

// Decimal(10,2) amounts are added up in whole kopecks: float addition drifts.
export const sumMoney = (amounts: number[]): number =>
  amounts.reduce((kopecks, amount) => kopecks + Math.round(amount * 100), 0) / 100;

const getGroupName = (row: IncomeHistoryLessonRow) => row.student?.name ?? row.prospectName ?? "";

// Namesakes stay apart by student id; each trial lesson without a student is
// its own group.
const getGroupKey = (row: IncomeHistoryLessonRow) =>
  row.student ? row.student.id : `prospect:${row.id}`;

const compareCodeUnits = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export const compareEntriesWithinDay = (
  a: IncomeHistoryLessonRow,
  b: IncomeHistoryLessonRow
): number =>
  getGroupName(a).localeCompare(getGroupName(b), "ru", { sensitivity: "base" }) ||
  compareCodeUnits(getGroupKey(a), getGroupKey(b)) ||
  a.startTime.getTime() - b.startTime.getTime() ||
  compareCodeUnits(a.id, b.id);

export const getPaymentDayKey = (row: IncomeHistoryLessonRow, timezone: string) =>
  toDateKeyInTimezone(row.paymentDate ?? row.startTime, timezone);

const collectFactCredits = (allocations: StudentCommissionAllocation[]) => {
  const credits = new Map<string, number>();
  for (const { allocation } of allocations) {
    for (const [lessonId, credit] of allocation.creditByLessonId) {
      if (credit.state === "FACT") credits.set(lessonId, credit.amount);
    }
  }
  return credits;
};

export const buildIncomeHistoryContext = (
  user: TaxUser | null,
  allocations: StudentCommissionAllocation[]
): IncomeHistoryContext => ({
  taxPeriods: user?.taxEnabled ? toTaxPeriodDtos(user.taxRatePeriods) : null,
  commissionCredits: allocations.length > 0 ? collectFactCredits(allocations) : null,
});

// Same rate lookup and per-payment rounding as the tax card, so the rows add
// up to its total exactly.
const resolveEntryTax = (
  row: IncomeHistoryLessonRow,
  receivedAmount: number,
  taxPeriods: TaxRatePeriodDto[] | null
): IncomeHistoryTaxDto | null => {
  if (!taxPeriods) return null;
  if (row.isTaxExempt) return { kind: "EXEMPT" };

  const { rate, isOutsidePeriods, tax } = resolveLessonTax(
    receivedAmount,
    row.paymentDate ?? row.startTime,
    taxPeriods
  );
  return isOutsidePeriods ? { kind: "OUTSIDE_PERIODS" } : { kind: "TAXED", amount: tax, rate };
};

const getTaxAmount = (entry: IncomeHistoryEntryDto) =>
  entry.tax?.kind === "TAXED" ? entry.tax.amount : 0;

export const toEntry = (
  row: IncomeHistoryLessonRow,
  { taxPeriods, commissionCredits }: IncomeHistoryContext
): IncomeHistoryEntryDto => {
  const receivedAmount = row.receivedAmount?.toNumber() ?? 0;

  return {
    lessonId: row.id,
    student: row.student ? { name: row.student.name, archived: row.student.archived } : null,
    prospectName: row.prospectName,
    subject: row.subject,
    lessonType: row.lessonType,
    lessonStartTime: row.startTime.toISOString(),
    lessonEndTime: row.endTime.toISOString(),
    lessonStatus: row.status,
    price: row.price?.toNumber() ?? 0,
    receivedAmount,
    hasPaymentDate: row.paymentDate !== null,
    tax: resolveEntryTax(row, receivedAmount, taxPeriods),
    commissionCredit: commissionCredits?.get(row.id) ?? null,
  };
};

export const groupIntoDays = (
  rows: IncomeHistoryLessonRow[],
  timezone: string,
  context: IncomeHistoryContext
): IncomeHistoryDayDto[] => {
  const rowsByDay = new Map<string, IncomeHistoryLessonRow[]>();
  for (const row of rows) {
    const key = getPaymentDayKey(row, timezone);
    const dayRows = rowsByDay.get(key);
    if (dayRows) {
      dayRows.push(row);
    } else {
      rowsByDay.set(key, [row]);
    }
  }

  return [...rowsByDay.keys()]
    .sort((a, b) => compareCodeUnits(b, a))
    .map((date) => {
      const entries = [...(rowsByDay.get(date) ?? [])]
        .sort(compareEntriesWithinDay)
        .map((row) => toEntry(row, context));
      return {
        date,
        total: sumMoney(entries.map((entry) => entry.receivedAmount)),
        taxTotal: context.taxPeriods ? sumMoney(entries.map(getTaxAmount)) : null,
        entries,
      };
    });
};

export const buildSummary = (
  days: IncomeHistoryDayDto[],
  { taxPeriods, commissionCredits }: IncomeHistoryContext
): IncomeHistorySummaryDto => {
  const entries = days.flatMap((day) => day.entries);
  const exemptAmounts = entries
    .filter((entry) => entry.tax?.kind === "EXEMPT")
    .map((entry) => entry.receivedAmount);

  return {
    total: sumMoney(days.map((day) => day.total)),
    count: entries.length,
    taxTotal: taxPeriods ? sumMoney(entries.map(getTaxAmount)) : null,
    taxExemptTotal: taxPeriods ? sumMoney(exemptAmounts) : null,
    commissionTotal: commissionCredits
      ? sumMoney(entries.map((entry) => entry.commissionCredit ?? 0))
      : null,
  };
};

const countEntries = (days: IncomeHistoryDayDto[]) =>
  days.reduce((count, day) => count + day.entries.length, 0);

const takeWholeDays = (days: IncomeHistoryDayDto[], pageSize: number) => {
  const taken: IncomeHistoryDayDto[] = [];
  let count = 0;
  for (const day of days) {
    if (taken.length > 0 && count + day.entries.length > pageSize) break;
    taken.push(day);
    count += day.entries.length;
  }
  return taken;
};

// Days are newest first and never split. `before` continues strictly after
// the given day; `through` reloads every day down to the given one inclusive,
// ignoring the page size, so a reload keeps the depth the tutor scrolled to.
export const slicePage = (
  days: IncomeHistoryDayDto[],
  { before, through }: IncomeHistoryCursor,
  pageSize: number = INCOME_HISTORY_PAGE_SIZE
): IncomeHistorySlice => {
  const candidates = before ? days.filter((day) => day.date < before) : days;
  const taken = through
    ? candidates.filter((day) => day.date >= through)
    : takeWholeDays(candidates, pageSize);
  const rest = candidates.slice(taken.length);
  const lastTaken = taken.length > 0 ? taken[taken.length - 1].date : (through ?? null);

  return {
    days: taken,
    page: {
      nextCursor: rest.length > 0 ? lastTaken : null,
      remainingCount: countEntries(rest),
    },
  };
};
