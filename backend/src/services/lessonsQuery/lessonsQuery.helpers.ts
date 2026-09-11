import type { LessonStatus, Prisma } from "@prisma/client";
import { truncateToMinute } from "../../utils/time";
import type {
  LessonsPagination,
  LessonsQueryParams,
} from "./lessonsQuery.types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 10;

const QUERY_KEYS: Array<keyof LessonsQueryParams> = [
  "startDate",
  "endDate",
  "studentId",
  "status",
  "upcoming",
  "currentTime",
  "page",
  "limit",
  "weekly",
  "noPagination",
  "weekStart",
  "onlyUnpaid",
  "onlyWithoutHomework",
  "paymentDateFrom",
  "paymentDateTo",
];

export const parseLessonsQuery = (
  query: Record<string, unknown>,
): LessonsQueryParams => {
  const params: LessonsQueryParams = {};
  for (const key of QUERY_KEYS) {
    const value = query[key];
    if (typeof value === "string") {
      params[key] = value;
    }
  }
  return params;
};

export const parseLessonsPagination = (
  params: LessonsQueryParams,
): LessonsPagination => {
  const page = Math.max(1, parseInt(params.page ?? "", 10) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(params.limit ?? "", 10) || DEFAULT_PAGE_SIZE),
  );
  return { page, limit, skip: (page - 1) * limit };
};

const buildStartTimeFilter = (
  params: LessonsQueryParams,
): Prisma.LessonWhereInput["startTime"] | undefined => {
  if (params.weekly === "true" && params.weekStart) {
    const startOfWeek = truncateToMinute(new Date(params.weekStart));
    // End of week = start + 7 days - 1ms (timezone-agnostic arithmetic)
    return {
      gte: startOfWeek,
      lte: new Date(startOfWeek.getTime() + WEEK_MS - 1),
    };
  }

  if (!params.startDate && !params.endDate) {
    return undefined;
  }

  const filter: { gte?: Date; lte?: Date } = {};
  if (params.startDate) {
    filter.gte = truncateToMinute(new Date(params.startDate));
  }
  if (params.endDate) {
    filter.lte = truncateToMinute(new Date(params.endDate));
  }
  return filter;
};

const buildStatusFilter = (
  params: LessonsQueryParams,
): Pick<Prisma.LessonWhereInput, "OR" | "status"> => {
  if (params.weekly === "true") {
    return {};
  }

  if (params.upcoming === "true" && params.currentTime) {
    const now = truncateToMinute(new Date(params.currentTime));
    return {
      OR: [
        { status: "IN_PROGRESS" },
        {
          status: { in: ["SCHEDULED", "RESCHEDULED"] },
          startTime: { gte: now },
        },
      ],
    };
  }

  if (!params.status) {
    return {};
  }

  const statuses = params.status
    .split(",")
    .map((s) => s.trim() as LessonStatus);
  return {
    status: statuses.length > 1 ? { in: statuses } : statuses[0],
  };
};

export const buildLessonsWhere = (
  userId: string,
  params: LessonsQueryParams,
): Prisma.LessonWhereInput => {
  const where: Prisma.LessonWhereInput = { tutorId: userId };

  const startTime = buildStartTimeFilter(params);
  if (startTime) {
    where.startTime = startTime;
  }

  if (params.studentId) {
    where.studentId = params.studentId;
  }

  if (params.onlyUnpaid === "true") {
    where.isPaid = false;
    where.price = { gt: 0 };
  } else if (params.paymentDateFrom || params.paymentDateTo) {
    where.paymentDate = {
      not: null,
      ...(params.paymentDateFrom
        ? { gte: new Date(params.paymentDateFrom) }
        : {}),
      ...(params.paymentDateTo ? { lte: new Date(params.paymentDateTo) } : {}),
    };
  }

  if (params.onlyWithoutHomework === "true") {
    where.isHomeworkSentByTeacher = false;
  }

  return { ...where, ...buildStatusFilter(params) };
};
