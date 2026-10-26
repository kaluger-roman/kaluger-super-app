import { beforeEach, describe, expect, it, vi } from "vitest";

import { api, studentApi } from "@shared";

import { getCallHistory, getLessonCalls } from "../callHistoryApi";

vi.mock("@shared", () => ({
  api: { get: vi.fn() },
  studentApi: { get: vi.fn() },
}));

const mockedApiGet = vi.mocked(api.get);
const mockedStudentApiGet = vi.mocked(studentApi.get);

describe("entities/callRecord/api/getCallHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call the tutor endpoint for the tutor principal", async () => {
    mockedApiGet.mockResolvedValue({ data: { items: [] } });

    await getCallHistory("tutor");

    expect(mockedApiGet).toHaveBeenCalledWith("/calls/history");
    expect(mockedStudentApiGet).not.toHaveBeenCalled();
  });

  it("should call the student endpoint for the student principal", async () => {
    mockedStudentApiGet.mockResolvedValue({ data: { items: [] } });

    await getCallHistory("student");

    expect(mockedStudentApiGet).toHaveBeenCalledWith("/student/calls/history");
    expect(mockedApiGet).not.toHaveBeenCalled();
  });

  it("should return the items array from the response", async () => {
    const records = [
      {
        id: "1",
        peerName: "Иван",
        direction: "outgoing" as const,
        startedAt: "2026-06-03T14:32:00.000Z",
        durationSeconds: 10,
        status: "COMPLETED" as const,
      },
    ];
    mockedApiGet.mockResolvedValue({ data: { items: records } });

    await expect(getCallHistory("tutor")).resolves.toEqual(records);
  });
});

describe("entities/callRecord/api/getLessonCalls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load the calls of the lesson from the tutor endpoint", async () => {
    mockedApiGet.mockResolvedValue({ data: { items: [] } });

    await expect(getLessonCalls("lesson-1")).resolves.toEqual([]);

    expect(mockedApiGet).toHaveBeenCalledWith("/calls/lessons/lesson-1");
    expect(mockedStudentApiGet).not.toHaveBeenCalled();
  });

  it("should encode the lesson id in the path", async () => {
    mockedApiGet.mockResolvedValue({ data: { items: [] } });

    await getLessonCalls("a/b");

    expect(mockedApiGet).toHaveBeenCalledWith("/calls/lessons/a%2Fb");
  });
});
