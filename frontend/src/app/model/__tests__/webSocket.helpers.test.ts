import { describe, expect, it, vi } from "vitest";

import { dispatchTutorMessage } from "../webSocket.helpers";

describe("app/model/webSocket.helpers dispatchTutorMessage", () => {
  it("should pass a lesson status update to the handler", () => {
    const onLessonStatus = vi.fn();

    dispatchTutorMessage(
      JSON.stringify({ type: "lesson_status_updated", lessonId: "l-1", status: "COMPLETED" }),
      onLessonStatus
    );

    expect(onLessonStatus).toHaveBeenCalledWith({ lessonId: "l-1", status: "COMPLETED" });
  });

  it("should log and ignore a message that is not JSON", () => {
    const onLessonStatus = vi.fn();
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

    dispatchTutorMessage("not json", onLessonStatus);

    expect(onLessonStatus).not.toHaveBeenCalled();
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });
});
