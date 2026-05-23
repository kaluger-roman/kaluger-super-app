import type { Response } from "express";

import type { AuthRequest } from "../../middleware/auth";
import {
  getInvitationStatus,
  issueInvitation,
  revokeInvitation,
} from "../../services/studentInvitation";

export const tutorIssueInvitation = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const tutorId = req.user?.userId;
    if (!tutorId) {
      return res.status(401).json({ error: "Не авторизован" });
    }

    const { id: studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ error: "ID ученика обязателен" });
    }

    const result = await issueInvitation(tutorId, studentId);
    if (!result.ok) {
      if (result.reason === "student_not_found") {
        return res.status(404).json({ error: "Ученик не найден" });
      }
      if (result.reason === "not_owner") {
        return res
          .status(403)
          .json({ error: "Нет доступа к этой карточке ученика" });
      }
      if (result.reason === "archived") {
        return res.status(409).json({
          error:
            "Архивированному ученику нельзя выдать приглашение — снимите архивацию",
        });
      }
      if (result.reason === "already_registered") {
        return res.status(409).json({
          error: "У этого ученика уже есть зарегистрированный аккаунт",
        });
      }
    }

    if (result.ok) {
      return res.status(201).json({
        inviteUrl: result.inviteUrl,
        expiresAt: result.expiresAt.toISOString(),
        status: "pending" as const,
      });
    }
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  } catch (error) {
    console.error("Tutor issue invitation error:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const tutorReadInvitationStatus = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const tutorId = req.user?.userId;
    if (!tutorId) {
      return res.status(401).json({ error: "Не авторизован" });
    }

    const { id: studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ error: "ID ученика обязателен" });
    }

    const result = await getInvitationStatus(tutorId, studentId);
    if ("error" in result) {
      if (result.error === "not_found") {
        return res.status(404).json({ error: "Ученик не найден" });
      }
      if (result.error === "forbidden") {
        return res
          .status(403)
          .json({ error: "Нет доступа к этой карточке ученика" });
      }
    }

    return res.json(result);
  } catch (error) {
    console.error("Tutor read invitation status error:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const tutorRevokeInvitation = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const tutorId = req.user?.userId;
    if (!tutorId) {
      return res.status(401).json({ error: "Не авторизован" });
    }

    const { id: studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ error: "ID ученика обязателен" });
    }

    const result = await revokeInvitation(tutorId, studentId);
    if (!result.ok) {
      if (result.reason === "student_not_found") {
        return res.status(404).json({ error: "Ученик не найден" });
      }
      if (result.reason === "not_owner") {
        return res
          .status(403)
          .json({ error: "Нет доступа к этой карточке ученика" });
      }
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Tutor revoke invitation error:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
