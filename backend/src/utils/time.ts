export const truncateToMinute = (date: Date) => {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
};

export const isValidTimezone = (timezone: string): boolean => {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

// Get UTC offset (in ms) for a given IANA timezone at a specific moment.
// Positive offset means timezone is ahead of UTC (e.g. +3h for Moscow).
const getTimezoneOffsetMs = (date: Date, timezone: string): number => {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = date.toLocaleString("en-US", { timeZone: timezone });
  return new Date(utcStr).getTime() - new Date(tzStr).getTime();
};

// Get year and month (0-based) as they appear in the given timezone
const getYearMonthInTimezone = (
  date: Date,
  timezone: string
): { year: number; month: number } => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);

  return {
    year: parseInt(parts.find((p) => p.type === "year")!.value),
    month: parseInt(parts.find((p) => p.type === "month")!.value) - 1,
  };
};

// UTC Date representing midnight on the 1st of the given month in the given timezone
export const startOfMonthInTimezone = (
  year: number,
  month: number,
  timezone: string
): Date => {
  const approx = new Date(Date.UTC(year, month, 1));
  const offset = getTimezoneOffsetMs(approx, timezone);
  return new Date(approx.getTime() + offset);
};

// UTC Date representing 23:59:59.999 on the last day of the given month in the given timezone
export const endOfMonthInTimezone = (
  year: number,
  month: number,
  timezone: string
): Date => {
  const approx = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  const offset = getTimezoneOffsetMs(approx, timezone);
  return new Date(approx.getTime() + offset);
};

// Get current month boundaries in the given timezone (falls back to UTC)
export const getCurrentMonthRange = (timezone?: string) => {
  const now = new Date();

  if (!timezone) {
    return {
      gte: new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
      ),
      lte: new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() + 1,
          0,
          23,
          59,
          59,
          999
        )
      ),
    };
  }

  const { year, month } = getYearMonthInTimezone(now, timezone);
  return {
    gte: startOfMonthInTimezone(year, month, timezone),
    lte: endOfMonthInTimezone(year, month, timezone),
  };
};

// Get previous month boundaries in the given timezone (falls back to UTC)
export const getLastMonthBounds = (timezone?: string) => {
  const now = new Date();

  if (!timezone) {
    return {
      gte: new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0)
      ),
      lte: new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999)
      ),
    };
  }

  const { year, month } = getYearMonthInTimezone(now, timezone);
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;

  return {
    gte: startOfMonthInTimezone(prevYear, prevMonth, timezone),
    lte: endOfMonthInTimezone(prevYear, prevMonth, timezone),
  };
};
