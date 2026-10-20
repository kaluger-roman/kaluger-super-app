import { describe, expect, it } from "vitest";

import {
  isPickerDismissed,
  toCanceledText,
  toPeerEndedText,
  toUnavailableText,
} from "../call.helpers";

describe("features/videoCall/model/call.helpers isPickerDismissed", () => {
  it("should treat a cancelled screen picker as dismissed", () => {
    expect(isPickerDismissed(new DOMException("denied", "NotAllowedError"))).toBe(true);
    expect(isPickerDismissed(new DOMException("aborted", "AbortError"))).toBe(true);
  });

  it("should not treat other failures as dismissed", () => {
    expect(isPickerDismissed(new Error("renegotiation failed"))).toBe(false);
    expect(isPickerDismissed(new DOMException("busy", "NotReadableError"))).toBe(false);
    expect(isPickerDismissed(null)).toBe(false);
    expect(isPickerDismissed("NotAllowedError")).toBe(false);
  });
});

describe("features/videoCall/model/call.helpers toast texts", () => {
  it("should name the offline peer by role", () => {
    expect(toUnavailableText("student")).toBe("Ученик сейчас не в сети");
    expect(toUnavailableText("tutor")).toBe("Репетитор сейчас не в сети");
    expect(toUnavailableText(null)).toBe("Собеседник сейчас не в сети");
  });

  it("should tell a timeout apart from a cancel", () => {
    expect(toCanceledText({ reason: "canceled", callerName: "Анна" })).toBe("Вызов отменён");
    expect(toCanceledText({ reason: "timeout", callerName: "Анна" })).toBe(
      "Пропущенный вызов от Анна"
    );
    expect(toCanceledText({ reason: "timeout", callerName: "" })).toBe("Пропущенный вызов");
  });

  it("should explain why the peer ended the call", () => {
    expect(toPeerEndedText("hangup")).toBe("Собеседник завершил звонок");
    expect(toPeerEndedText("peer_disconnected")).toBe("Собеседник отключился");
    expect(toPeerEndedText("media_unavailable")).toBe(
      "У собеседника нет доступа к камере и микрофону"
    );
  });
});
