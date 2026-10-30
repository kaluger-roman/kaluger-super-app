import type { Response } from "express";
import type { PushUnsubscribeDto, StudentRequest } from "../../types";
import { prisma } from "../../lib/prisma";

export const studentPushUnsubscribe = async (req: StudentRequest, res: Response) => {
  try {
    const studentUserId = req.studentUser?.studentUserId;
    if (!studentUserId) {
      return res.status(401).json({ error: "Не авторизован" });
    }

    const data: PushUnsubscribeDto | undefined = req.body;
    if (typeof data?.endpoint !== "string" || !data.endpoint) {
      return res.status(400).json({ error: "Некорректные данные подписки" });
    }

    const { count } = await prisma.pushSubscription.deleteMany({
      where: { endpoint: data.endpoint, studentUserId },
    });

    if (count === 0) {
      return res.status(404).json({ error: "Подписка не найдена" });
    }

    return res.json({ message: "Подписка удалена" });
  } catch (error) {
    console.error("Student push unsubscribe error:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
