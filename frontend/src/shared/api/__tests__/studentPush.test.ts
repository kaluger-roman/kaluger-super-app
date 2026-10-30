import { describe, it, expect, vi, beforeEach } from "vitest";

import { studentApi } from "../studentBase";
import { studentPushApi } from "../studentPush";

vi.mock("../studentBase", () => ({
  studentApi: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("studentPushApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should send the device subscription to the student endpoint", async () => {
    const request = {
      subscription: { endpoint: "https://push.example.com/1", keys: { p256dh: "p", auth: "a" } },
    };
    const info = {
      id: "s1",
      endpoint: "https://push.example.com/1",
      deviceName: null,
      createdAt: "2026-10-27T00:00:00.000Z",
    };
    vi.mocked(studentApi.post).mockResolvedValue({ data: info });

    await expect(studentPushApi.subscribe(request)).resolves.toEqual(info);
    expect(studentApi.post).toHaveBeenCalledWith("/student-push/subscribe", request);
  });

  it("should delete the device subscription by endpoint", async () => {
    vi.mocked(studentApi.delete).mockResolvedValue({ data: { message: "Подписка удалена" } });

    await studentPushApi.unsubscribe("https://push.example.com/1");

    expect(studentApi.delete).toHaveBeenCalledWith("/student-push/unsubscribe", {
      data: { endpoint: "https://push.example.com/1" },
    });
  });

  it("should pass a failed request on to the caller", async () => {
    vi.mocked(studentApi.delete).mockRejectedValue(new Error("Подписка не найдена"));

    await expect(studentPushApi.unsubscribe("https://push.example.com/2")).rejects.toThrow(
      "Подписка не найдена"
    );
  });
});
