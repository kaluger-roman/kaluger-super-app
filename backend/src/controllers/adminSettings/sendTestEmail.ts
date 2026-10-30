import type { Response } from "express";
import type { AdminRequest, TestEmailResponse } from "../../types";
import { sendTestEmail as sendTestEmailService } from "../../services";
import {
  AdminEmailSendError,
  AlertEmailNotConfiguredError,
  TestEmailRateLimitError,
} from "../../utils";

export const sendTestEmail = async (req: AdminRequest, res: Response) => {
  try {
    const response: TestEmailResponse = await sendTestEmailService();
    return res.json(response);
  } catch (error) {
    if (error instanceof AlertEmailNotConfiguredError) {
      return res.status(400).json({ error: "Сначала сохраните адрес для уведомлений" });
    }
    if (error instanceof TestEmailRateLimitError) {
      return res
        .status(429)
        .json({ error: "Тестовое письмо можно отправлять не чаще раза в минуту" });
    }
    if (error instanceof AdminEmailSendError) {
      return res.status(502).json({ error: `Не удалось отправить письмо: ${error.message}` });
    }
    console.error("Error sending admin test email:", error);
    return res.status(500).json({ error: "Ошибка отправки тестового письма" });
  }
};
