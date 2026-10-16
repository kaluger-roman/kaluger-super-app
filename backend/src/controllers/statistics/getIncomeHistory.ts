import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";
import { collectIncomeHistory } from "../../services";
import type { IncomeHistoryQuery } from "../../types";
import { isValidTimezone } from "../../utils";
import { validateIncomeHistoryQuery } from "./getIncomeHistory.validators";
import { getDateRange } from "./utils";

export const getIncomeHistory = async (req: AuthRequest, res: Response) => {
  try {
    const error = validateIncomeHistoryQuery(req.query);
    if (error) {
      return res.status(400).json({ error });
    }

    const { startDate, endDate, before, through } = req.query as IncomeHistoryQuery;
    const header = req.headers["x-timezone"] as string | undefined;
    const timezone = header && isValidTimezone(header) ? header : "UTC";

    const history = await collectIncomeHistory({
      userId: req.user!.userId,
      range: getDateRange(startDate, endDate, timezone),
      timezone,
      before,
      through,
    });

    return res.json(history);
  } catch (error) {
    console.error("Get income history error:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
