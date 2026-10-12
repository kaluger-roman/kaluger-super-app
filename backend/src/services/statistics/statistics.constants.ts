import type { Prisma } from "@prisma/client";

export const ACTIVE_STATUSES = ["SCHEDULED", "RESCHEDULED", "IN_PROGRESS"] as const;

export const DAY_MS = 24 * 60 * 60 * 1000;

export const TAX_USER_SELECT = {
  taxEnabled: true,
  taxRatePeriods: {
    orderBy: { startDate: "asc" },
    select: { id: true, startDate: true, rate: true },
  },
} as const satisfies Prisma.UserSelect;
