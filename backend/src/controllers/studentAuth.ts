import type { Request, Response } from "express";

import {
  getStudentSettings,
  loginStudent,
  registerStudentByInvite,
} from "../services/studentAuth";
import {
  resendStudentVerificationCode,
  verifyStudentEmailCode,
} from "../services/studentEmailVerification";
import type {
  StudentLoginDto,
  StudentRegisterByInviteDto,
  StudentRequest,
  StudentVerifyEmailDto,
} from "../types";

export const studentRegister = async (
  req: Request<{}, {}, StudentRegisterByInviteDto>,
  res: Response
) => {
  try {
    const result = await registerStudentByInvite(req.body);
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.status(201).json(result.data);
  } catch (error) {
    console.error("Student register error:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const studentLogin = async (
  req: Request<{}, {}, StudentLoginDto>,
  res: Response
) => {
  try {
    const result = await loginStudent(req.body);
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.json(result.data);
  } catch (error) {
    console.error("Student login error:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const studentVerifyEmail = async (
  req: StudentRequest & Request<{}, {}, StudentVerifyEmailDto>,
  res: Response
) => {
  try {
    const studentUserId = req.studentUser?.studentUserId;
    if (!studentUserId) {
      return res.status(401).json({ error: "Не авторизован" });
    }

    const { code } = req.body;
    if (!code || !/^[0-9]{6}$/.test(code)) {
      return res
        .status(400)
        .json({ error: "Код подтверждения должен состоять из 6 цифр" });
    }

    const result = await verifyStudentEmailCode(studentUserId, code);
    if (!result.ok) {
      if (result.reason === "expired") {
        return res.status(400).json({
          error: "Срок действия кода истёк. Запросите новый код",
        });
      }
      if (result.reason === "attempts_exceeded") {
        return res.status(400).json({
          error: "Превышено количество попыток. Запросите новый код",
        });
      }
      return res.status(400).json({ error: "Неверный код подтверждения" });
    }

    const settings = await getStudentSettings(studentUserId);
    if (!settings) {
      return res.status(404).json({ error: "Аккаунт не найден" });
    }
    return res.json(settings);
  } catch (error) {
    console.error("Student verify email error:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const studentResendVerification = async (
  req: StudentRequest,
  res: Response
) => {
  try {
    const studentUserId = req.studentUser?.studentUserId;
    if (!studentUserId) {
      return res.status(401).json({ error: "Не авторизован" });
    }

    const result = await resendStudentVerificationCode(studentUserId);
    if (!result.ok) {
      if (result.reason === "cooldown") {
        return res.status(429).json({
          error: `Подождите ещё ${result.retryAfterSeconds ?? 60} секунд перед повторной отправкой`,
        });
      }
      if (result.reason === "send_failed") {
        return res
          .status(500)
          .json({ error: "Ошибка отправки письма. Попробуйте позже" });
      }
      return res.status(400).json({ error: "Email уже подтверждён" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Student resend verification error:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const studentMe = async (req: StudentRequest, res: Response) => {
  try {
    const studentUserId = req.studentUser?.studentUserId;
    if (!studentUserId) {
      return res.status(401).json({ error: "Не авторизован" });
    }

    const settings = await getStudentSettings(studentUserId);
    if (!settings) {
      return res.status(404).json({ error: "Аккаунт не найден" });
    }
    return res.json(settings);
  } catch (error) {
    console.error("Student me error:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const studentLogout = async (_req: StudentRequest, res: Response) => {
  // JWT — stateless, серверного блок-листа нет. Логаут на стороне клиента —
  // достаточно удалить токен. Эндпоинт для симметрии с tutor-логаутом.
  return res.status(204).send();
};
