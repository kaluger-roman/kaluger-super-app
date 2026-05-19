import type { Request, Response } from "express";

import { validateRawToken } from "../services/studentInvitation";

export const studentInvitationValidate = async (
  req: Request<{ token: string }>,
  res: Response
) => {
  try {
    const { token } = req.params;
    if (!token || typeof token !== "string") {
      return res.json({ valid: false });
    }

    const result = await validateRawToken(token);
    if (!result.ok) {
      return res.json({ valid: false });
    }

    return res.json({
      valid: true,
      studentName: result.studentName,
      tutorName: result.tutorName,
    });
  } catch (error) {
    console.error("Student invitation validate error:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
