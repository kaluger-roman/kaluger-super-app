import { afterEach, describe, expect, it, vi } from "vitest";

import {
  formatCallDuration,
  getCallDirectionLabel,
  getCallStatusLabel,
  getInitials,
  hasKeyboardFocusWithin,
  isKeyboardFocus,
} from "../videoCall.helpers";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

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
    expect(getCallStatusLabel("COMPLETED", "incoming")).toBe("Завершён");
    expect(getCallStatusLabel("MISSED", "incoming")).toBe("Пропущен");
    expect(getCallStatusLabel("REJECTED", "incoming")).toBe("Отклонён");
    expect(getCallStatusLabel("CANCELED", "incoming")).toBe("Отменён");
    expect(getCallStatusLabel("FAILED", "incoming")).toBe("Не удалось соединиться");
    expect(getCallStatusLabel("COMPLETED", "outgoing")).toBe("Завершён");
  });

  it("should not call an unanswered outgoing call missed (regression: offline tutor shown as missed to the student)", () => {
    expect(getCallStatusLabel("MISSED", "outgoing")).toBe("Без ответа");
  });

  it("should label the call direction", () => {
    expect(getCallDirectionLabel("outgoing")).toBe("Исходящий");
    expect(getCallDirectionLabel("incoming")).toBe("Входящий");
  });

  it("should take only a visible focus for keyboard focus", () => {
    const button = document.createElement("button");
    const matches = vi.spyOn(button, "matches");

    matches.mockReturnValueOnce(true);
    expect(isKeyboardFocus(button)).toBe(true);

    matches.mockReturnValueOnce(false);
    expect(isKeyboardFocus(button)).toBe(false);

    expect(matches).toHaveBeenCalledWith(":focus-visible");
    expect(isKeyboardFocus(null)).toBe(false);
  });

  it("should treat any focus as keyboard focus where :focus-visible is unknown", () => {
    const button = document.createElement("button");
    vi.spyOn(button, "matches").mockImplementation(() => {
      throw new SyntaxError("unknown pseudo-class");
    });

    expect(isKeyboardFocus(button)).toBe(true);
  });

  it("should see keyboard focus only on an enabled element inside the container", () => {
    document.body.innerHTML =
      '<div data-zone><button id="inside">a</button></div><button id="outside">b</button>';
    const inside = document.getElementById("inside") as HTMLButtonElement;
    const outside = document.getElementById("outside") as HTMLButtonElement;

    inside.focus();
    expect(hasKeyboardFocusWithin("[data-zone]")).toBe(true);

    outside.focus();
    expect(hasKeyboardFocusWithin("[data-zone]")).toBe(false);

    inside.focus();
    inside.disabled = true;
    expect(hasKeyboardFocusWithin("[data-zone]")).toBe(false);
  });

  it("should not take a focus a mouse click put inside the container for keyboard focus", () => {
    document.body.innerHTML = '<div data-zone><button id="inside">a</button></div>';
    const inside = document.getElementById("inside") as HTMLButtonElement;
    const matches = inside.matches.bind(inside);
    vi.spyOn(inside, "matches").mockImplementation((selector) =>
      selector === ":focus-visible" ? false : matches(selector)
    );

    inside.focus();

    expect(hasKeyboardFocusWithin("[data-zone]")).toBe(false);
  });
});
