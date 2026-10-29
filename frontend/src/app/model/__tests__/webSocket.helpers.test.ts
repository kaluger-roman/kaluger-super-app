import { afterEach, describe, expect, it, vi } from "vitest";

import { dispatchTutorMessage, resumeTutorSession } from "../webSocket.helpers";

describe("app/model/webSocket.helpers dispatchTutorMessage", () => {
  it("should pass a lesson status update to the handler", () => {
    const onLessonStatus = vi.fn();

    dispatchTutorMessage(
      { type: "lesson_status_updated", lessonId: "l-1", status: "COMPLETED" },
      onLessonStatus
    );

    expect(onLessonStatus).toHaveBeenCalledWith({ lessonId: "l-1", status: "COMPLETED" });
  });

  it("should drop a lesson status update with missing fields", () => {
    const onLessonStatus = vi.fn();

    dispatchTutorMessage({ type: "lesson_status_updated", lessonId: 1 }, onLessonStatus);

    expect(onLessonStatus).not.toHaveBeenCalled();
  });
});

describe("app/model/webSocket.helpers resumeTutorSession", () => {
  afterEach(() => {
    localStorage.removeItem("authToken");
  });

  it("should resume after a plain close or once the revoked token was replaced", () => {
    localStorage.setItem("authToken", "fresh-token");

    expect(resumeTutorSession(null)).toBe(true);
    expect(resumeTutorSession("old-token")).toBe(true);
    expect(localStorage.getItem("authToken")).toBe("fresh-token");
  });

  it("should end the session when the current token was revoked", () => {
    localStorage.setItem("authToken", "old-token");

    expect(resumeTutorSession("old-token")).toBe(false);
    expect(localStorage.getItem("authToken")).toBeNull();
  });
});
