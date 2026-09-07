import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";
import { collectLessonStatistics } from "../../services";
import { truncateToMinute } from "../../utils/time";
import { buildStatisticsWhere, getDateRange, getLastMonthRange } from "./utils";

export const getStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { startDate, endDate } = req.query;
    const timezone = req.headers["x-timezone"] as string | undefined;

    const statistics = await collectLessonStatistics({
      userId,
      where: buildStatisticsWhere(
        userId,
        startDate as string,
        endDate as string,
        timezone,
      ),
      paymentDateRange: getDateRange(
        startDate as string,
        endDate as string,
        timezone,
      ),
      lastMonthRange: getLastMonthRange(timezone),
      now: truncateToMinute(new Date()),
    });

    res.json(statistics);
  } catch (error) {
    console.error("Get statistics error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
