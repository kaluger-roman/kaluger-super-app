import { describe, expect, it } from "vitest";

import {
  formatCallDuration,
  getCallDirectionLabel,
  getCallStatusLabel,
  getInitials,
} from "../videoCall.helpers";

describe("features/videoCall helpers", () => {
  it("should format durations under an hour as m:ss", () => {
    expect(formatCallDuration(0)).toBe("0:00");
    expect(formatCallDuration(65)).toBe("1:05");
    expect(formatCallDuration(59 * 60 + 59)).toBe("59:59");
  });

  it("should format durations of an hour and more as h:mm:ss", () => {
    expect(formatCallDuration(3600)).toBe("1:00:00");
    expect(formatCallDuration(3600 + 5 * 60 + 7)).toBe("1:05:07");
  });

  it("should show a dash when there is no duration", () => {
    expect(formatCallDuration(null)).toBe("—");
  });

  it("should take up to two uppercase initials", () => {
    expect(getInitials("анна петрова")).toBe("АП");
    expect(getInitials("  Иван  ")).toBe("И");
    expect(getInitials("Анна Мария Петрова")).toBe("АМ");
  });

  it("should label every call status in Russian", () => {
    expect(getCallStatusLabel("COMPLETED")).toBe("Завершён");
    expect(getCallStatusLabel("MISSED")).toBe("Пропущен");
    expect(getCallStatusLabel("REJECTED")).toBe("Отклонён");
    expect(getCallStatusLabel("CANCELED")).toBe("Отменён");
    expect(getCallStatusLabel("FAILED")).toBe("Не удалось соединиться");
  });

  it("should label the call direction", () => {
    expect(getCallDirectionLabel("outgoing")).toBe("Исходящий");
    expect(getCallDirectionLabel("incoming")).toBe("Входящий");
  });
});
