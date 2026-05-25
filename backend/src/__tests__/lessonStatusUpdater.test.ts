import prisma from "../lib/prisma";
import { updateLessonStatuses } from "../services/lessonStatusUpdater";

jest.mock("../lib/wsManager", () => ({
  getWebSocketManager: jest.fn(() => ({
    broadcastLessonStatusUpdate: jest.fn(),
  })),
}));

describe("updateLessonStatuses select-only payload", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should request only id/tutorId columns from lessons.findMany (cron payload optimisation)", async () => {
    const findManySpy = jest.spyOn(prisma.lesson, "findMany");
    try {
      await updateLessonStatuses();

      expect(findManySpy).toHaveBeenCalled();
      for (const call of findManySpy.mock.calls) {
        const args = call[0] as { select?: Record<string, boolean> };
        expect(args.select).toBeDefined();
        const keys = Object.keys(args.select ?? {});
        expect(keys.length).toBeGreaterThan(0);
        for (const key of keys) {
          expect(["id", "tutorId"]).toContain(key);
        }
      }
    } finally {
      findManySpy.mockRestore();
    }
  });
});
