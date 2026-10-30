import { describe, it, expect } from "vitest";

import { formatDateTime } from "@shared";
import type { RestoreCheckResult } from "@shared";

import { getOffsiteSyncLine, getRestoreCheckLine } from "../OffsiteStorageStatus.helpers";

const NOW = Date.parse("2026-10-16T12:00:00Z");
const HOUR_MS = 60 * 60 * 1000;
const SYNC_STALE_HOURS = 24;
const RESTORE_STALE_HOURS = 48;
const hoursAgo = (hours: number) => new Date(NOW - hours * HOUR_MS).toISOString();

const success = (
  checkedAt: string,
  counts = { users: 14, students: 93, lessons: 2431 }
): RestoreCheckResult => ({
  checkedAt,
  fileName: "backup-2026-10-16T00-00-01-123Z.sql.gz",
  status: "success",
  counts,
});

describe("getOffsiteSyncLine", () => {
  it("should warn when copying never happened", () => {
    expect(getOffsiteSyncLine(null, SYNC_STALE_HOURS, NOW)).toEqual({
      text: "Резервное хранилище: копирование ещё не выполнялось",
      isWarning: true,
    });
  });

  it("should show a fresh copy as plain text", () => {
    const syncedAt = hoursAgo(1 / 3);

    expect(getOffsiteSyncLine(syncedAt, SYNC_STALE_HOURS, NOW)).toEqual({
      text: `Резервное хранилище: ${formatDateTime(syncedAt)}`,
      isWarning: false,
    });
  });

  it("should warn when the copy is older than 24 hours", () => {
    const syncedAt = hoursAgo(25);

    expect(getOffsiteSyncLine(syncedAt, SYNC_STALE_HOURS, NOW)).toEqual({
      text: `Резервное хранилище: ${formatDateTime(syncedAt)} — давно не обновлялось (больше 24\u00a0часов)`,
      isWarning: true,
    });
  });

  it("should use the threshold it is given", () => {
    const syncedAt = hoursAgo(7);

    expect(getOffsiteSyncLine(syncedAt, 12, NOW).isWarning).toBe(false);
    expect(getOffsiteSyncLine(syncedAt, 6, NOW)).toEqual({
      text: `Резервное хранилище: ${formatDateTime(syncedAt)} — давно не обновлялось (больше 6\u00a0часов)`,
      isWarning: true,
    });
  });

  it("should put the singular threshold in the genitive", () => {
    expect(getOffsiteSyncLine(hoursAgo(2), 1, NOW).text).toContain("(больше 1\u00a0часа)");
  });
});

describe("getRestoreCheckLine", () => {
  it("should warn when the check never ran", () => {
    expect(getRestoreCheckLine(null, RESTORE_STALE_HOURS, NOW)).toEqual({
      text: "Проверка восстановления: ещё не выполнялась",
      isWarning: true,
    });
  });

  it("should show a recent success with pluralised counts as plain text", () => {
    const checkedAt = hoursAgo(9);

    expect(getRestoreCheckLine(success(checkedAt), RESTORE_STALE_HOURS, NOW)).toEqual({
      text: `Проверка восстановления: ${formatDateTime(checkedAt)} — успешно (14\u00a0пользователей, 93\u00a0ученика, 2431\u00a0урок)`,
      isWarning: false,
    });
  });

  it("should use singular and few forms", () => {
    const checkedAt = hoursAgo(1);
    const check = success(checkedAt, { users: 1, students: 22, lessons: 11 });

    expect(getRestoreCheckLine(check, RESTORE_STALE_HOURS, NOW).text).toContain(
      "1\u00a0пользователь, 22\u00a0ученика, 11\u00a0уроков"
    );
  });

  it("should warn when the last success is older than 48 hours", () => {
    const checkedAt = hoursAgo(49);

    expect(getRestoreCheckLine(success(checkedAt), RESTORE_STALE_HOURS, NOW)).toEqual({
      text: `Проверка восстановления: ${formatDateTime(checkedAt)} — успешно (14\u00a0пользователей, 93\u00a0ученика, 2431\u00a0урок), но это было больше 48\u00a0часов назад`,
      isWarning: true,
    });
  });

  it("should warn about an error result", () => {
    const checkedAt = hoursAgo(2);

    expect(
      getRestoreCheckLine(
        { checkedAt, fileName: null, status: "error", error: "таблица lessons пуста" },
        RESTORE_STALE_HOURS,
        NOW
      )
    ).toEqual({
      text: `Проверка восстановления: ${formatDateTime(checkedAt)} — ошибка: таблица lessons пуста`,
      isWarning: true,
    });
  });

  it("should use the threshold it is given", () => {
    const check = success(hoursAgo(30));

    expect(getRestoreCheckLine(check, 48, NOW).isWarning).toBe(false);
    expect(getRestoreCheckLine(check, 24, NOW).text).toMatch(/больше 24\u00a0часов назад$/);
    expect(getRestoreCheckLine(check, 24, NOW).isWarning).toBe(true);
  });
});
