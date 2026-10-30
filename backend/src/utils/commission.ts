import type {
  AllocateCommissionInput,
  CommissionAllocation,
  CommissionCredit,
  CommissionCreditState,
  CommissionLessonInput,
} from "../types";

// Whole kopecks everywhere: a chain of min()/subtraction on rouble floats
// drifts, and "repaid + remaining === commissionAmount" must hold exactly.
const toKopecks = (amount: number) => Math.round(amount * 100);

const compareById = (a: CommissionLessonInput, b: CommissionLessonInput) =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

// A lesson can be flagged paid without a paymentDate, so the lesson date is
// the fallback — the same effective date the statistics period uses.
const getEffectivePaymentDate = (lesson: CommissionLessonInput) =>
  (lesson.paymentDate ?? lesson.startTime).getTime();

// Lessons that are not paid yet have no payment order to follow, so the
// forecast walks them in the order they will be taught.
const compareByStartTimeThenId = (a: CommissionLessonInput, b: CommissionLessonInput) => {
  const byStartTime = a.startTime.getTime() - b.startTime.getTime();
  if (byStartTime !== 0) return byStartTime;

  return compareById(a, b);
};

// Repayment follows the order money actually arrived: the period a write-off
// lands in is decided by the payment date, so allocating by any other order
// would let a late payment for an early lesson rewrite a closed period.
// Lessons prepaid on one date are then repaid in the order they are taught.
const compareByPaymentThenStartTime = (a: CommissionLessonInput, b: CommissionLessonInput) => {
  const byPayment = getEffectivePaymentDate(a) - getEffectivePaymentDate(b);
  if (byPayment !== 0) return byPayment;

  return compareByStartTimeThenId(a, b);
};

const isFactEligible = (lesson: CommissionLessonInput) =>
  lesson.status === "COMPLETED" && lesson.isPaid;

const isForecastEligible = (lesson: CommissionLessonInput) =>
  lesson.status === "SCHEDULED" ||
  lesson.status === "RESCHEDULED" ||
  lesson.status === "IN_PROGRESS" ||
  (lesson.status === "COMPLETED" && !lesson.isPaid);

// A paid lesson repays the commission with the money that actually arrived;
// the forecast can only assume the lesson price.
const getReceivedAmount = (lesson: CommissionLessonInput) => lesson.receivedAmount ?? 0;

const getPrice = (lesson: CommissionLessonInput) => lesson.price ?? 0;

const runPass = (
  lessons: CommissionLessonInput[],
  startRemainingKop: number,
  isEligible: (lesson: CommissionLessonInput) => boolean,
  getAmount: (lesson: CommissionLessonInput) => number,
  state: CommissionCreditState,
  creditByLessonId: Map<string, CommissionCredit>
) => {
  let remainingKop = startRemainingKop;

  for (const lesson of lessons) {
    if (remainingKop <= 0) break;

    const amountKop = toKopecks(getAmount(lesson));
    if (amountKop <= 0 || !isEligible(lesson)) continue;

    const creditKop = Math.min(remainingKop, amountKop);
    creditByLessonId.set(lesson.id, { amount: creditKop / 100, state });
    remainingKop -= creditKop;
  }

  return remainingKop;
};

export const allocateCommission = ({
  commissionAmount,
  lessons,
}: AllocateCommissionInput): CommissionAllocation => {
  const creditByLessonId = new Map<string, CommissionCredit>();
  const commissionKop = toKopecks(commissionAmount);

  if (commissionKop <= 0) {
    return { repaid: 0, remaining: 0, creditByLessonId };
  }

  // The forecast pass starts from what the fact pass left over, so an unpaid
  // early lesson can never eat into the actually written-off amount.
  const factRemainingKop = runPass(
    [...lessons].sort(compareByPaymentThenStartTime),
    commissionKop,
    isFactEligible,
    getReceivedAmount,
    "FACT",
    creditByLessonId
  );
  runPass(
    [...lessons].sort(compareByStartTimeThenId),
    factRemainingKop,
    isForecastEligible,
    getPrice,
    "FORECAST",
    creditByLessonId
  );

  return {
    repaid: (commissionKop - factRemainingKop) / 100,
    remaining: factRemainingKop / 100,
    creditByLessonId,
  };
};
