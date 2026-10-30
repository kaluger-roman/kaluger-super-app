import { describe, it, expect } from "vitest";

import type { AdminAlertEmail } from "@shared";

import { makeAlert, RESOLVED } from "../../../../../__tests__/adminAlerts.fixtures";
import { getEmailStatusLines } from "../AlertEmailStatus.helpers";

const email = (overrides: Partial<AdminAlertEmail>): AdminAlertEmail => ({
  status: "sent",
  attempts: 1,
  lastError: null,
  ...overrides,
});

const openLine = (openEmail: AdminAlertEmail) => getEmailStatusLines(makeAlert({ openEmail }))[0];

describe("getEmailStatusLines", () => {
  it.each<[AdminAlertEmail["status"], string]>([
    ["sent", "Письмо о проблеме отправлено"],
    ["pending", "Письмо о проблеме ожидает отправки"],
    ["skipped_no_email", "Письмо о проблеме не отправлено: адрес не указан"],
    ["skipped_disabled", "Письмо о проблеме не отправлено: рассылка выключена"],
  ])("should describe the %s status", (status, text) => {
    expect(openLine(email({ status }))).toEqual({ kind: "open", text, isError: false });
  });

  it("should show a failed attempt with the error and the retry", () => {
    expect(
      openLine(
        email({ status: "failed", attempts: 3, lastError: "Resend: 503 Service Unavailable" })
      )
    ).toEqual({
      kind: "open",
      text: "Ошибка отправки письма о проблеме: Resend: 503 Service Unavailable. Попытка 3 из 5, повторим при следующей проверке",
      isError: true,
    });
  });

  it("should say sending stopped after the last attempt", () => {
    expect(openLine(email({ status: "failed", attempts: 5, lastError: "boom" })).text).toBe(
      "Ошибка отправки письма о проблеме: boom. Попыток: 5 из 5, отправка остановлена"
    );
  });

  it("should show a pending letter with every attempt used as stopped", () => {
    expect(openLine(email({ status: "pending", attempts: 5 }))).toEqual({
      kind: "open",
      text: "Ошибка отправки письма о проблеме: результат последней попытки неизвестен. Попыток: 5 из 5, отправка остановлена",
      isError: true,
    });
  });

  it("should fall back to an unknown error text", () => {
    expect(openLine(email({ status: "failed", attempts: 1 })).text).toContain(
      "письма о проблеме: неизвестная ошибка."
    );
  });

  it("should list only the opening letter while the alert is active", () => {
    expect(getEmailStatusLines(makeAlert())).toHaveLength(1);
  });

  it("should add the resolution letter for a resolved alert", () => {
    const lines = getEmailStatusLines(
      makeAlert({
        ...RESOLVED,
        resolveEmail: email({ status: "failed", attempts: 5, lastError: "Resend: 401" }),
      })
    );

    expect(lines.map(({ kind }) => kind)).toEqual(["open", "resolve"]);
    expect(lines[1]).toEqual({
      kind: "resolve",
      text: "Ошибка отправки письма о решении: Resend: 401. Попыток: 5 из 5, отправка остановлена",
      isError: true,
    });
  });
});
