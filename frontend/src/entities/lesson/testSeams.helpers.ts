import type { fork } from "effector";

import type { Lesson } from "@shared";

import * as apiModel from "./models/api.model";

// Test seams for the lesson lists. Production code never imports this file.

type ForkHandlerList = Extract<NonNullable<Parameters<typeof fork>[1]>["handlers"], unknown[]>;

// The lessons page models reload the open list after a lesson or a filter changes. A test that
// does either without checking the reload passes these to `fork({ handlers })` before its own
// handlers, and the reload answers with `lessons` instead of going to the network.
export const lessonListLoadHandlers = (lessons: Lesson[] = []): ForkHandlerList => {
  const loadPage = () =>
    Promise.resolve({
      lessons,
      pagination: { total: lessons.length, page: 1, limit: 10, totalPages: 1 },
    });
  return [
    apiModel.loadUpcomingLessonsFx,
    apiModel.loadCompletedLessonsFx,
    apiModel.loadCancelledLessonsFx,
    apiModel.loadAllLessonsFx,
    apiModel.loadWeeklyLessonsFx,
    apiModel.loadScheduleLessonsFx,
  ].map((fx): ForkHandlerList[number] => [fx, loadPage]);
};
