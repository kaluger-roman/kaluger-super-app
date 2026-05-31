import { allSettled, fork } from "effector";
import { describe, it, expect, vi } from "vitest";

import { lessonModel } from "@entities";

import "../lessons-reload.model";
import { CANCELLED_TAB_INDEX, COMPLETED_TAB_INDEX, UPCOMING_TAB_INDEX } from "../lessons-tabs.constants";
import * as tabsModel from "../lessons-tabs.model";
import * as viewModeModel from "../lessons-view-mode.model";

describe("lessons-reload.model — removeLessonFx reload", () => {
  it("should call loadUpcomingLessonsFx when on UPCOMING tab in paged mode", async () => {
    const loadUpcomingFn = vi.fn(() => Promise.resolve({ lessons: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } }));
    const removeLessonFn = vi.fn(() => Promise.resolve("lesson-1"));

    const scope = fork({
      handlers: [
        [lessonModel.removeLessonFx, removeLessonFn],
        [lessonModel.loadUpcomingLessonsFx, loadUpcomingFn],
      ],
      values: [
        [viewModeModel.$lessonsViewMode, "paged"],
        [tabsModel.$currentTab, UPCOMING_TAB_INDEX],
      ],
    });

    await allSettled(lessonModel.removeLesson, {
      scope,
      params: { id: "lesson-1" },
    });

    expect(loadUpcomingFn).toHaveBeenCalled();
  });

  it("should NOT call loadUpcomingLessonsFx when on COMPLETED tab in paged mode", async () => {
    const loadUpcomingFn = vi.fn(() => Promise.resolve({ lessons: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } }));
    const removeLessonFn = vi.fn(() => Promise.resolve("lesson-1"));

    const scope = fork({
      handlers: [
        [lessonModel.removeLessonFx, removeLessonFn],
        [lessonModel.loadUpcomingLessonsFx, loadUpcomingFn],
      ],
      values: [
        [viewModeModel.$lessonsViewMode, "paged"],
        [tabsModel.$currentTab, COMPLETED_TAB_INDEX],
      ],
    });

    await allSettled(lessonModel.removeLesson, {
      scope,
      params: { id: "lesson-1" },
    });

    expect(loadUpcomingFn).not.toHaveBeenCalled();
  });

  it("should NOT call loadUpcomingLessonsFx when on CANCELLED tab in paged mode", async () => {
    const loadUpcomingFn = vi.fn(() => Promise.resolve({ lessons: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } }));
    const removeLessonFn = vi.fn(() => Promise.resolve("lesson-1"));

    const scope = fork({
      handlers: [
        [lessonModel.removeLessonFx, removeLessonFn],
        [lessonModel.loadUpcomingLessonsFx, loadUpcomingFn],
      ],
      values: [
        [viewModeModel.$lessonsViewMode, "paged"],
        [tabsModel.$currentTab, CANCELLED_TAB_INDEX],
      ],
    });

    await allSettled(lessonModel.removeLesson, {
      scope,
      params: { id: "lesson-1" },
    });

    expect(loadUpcomingFn).not.toHaveBeenCalled();
  });

  it("should NOT call loadUpcomingLessonsFx when in weekly mode", async () => {
    const loadUpcomingFn = vi.fn(() => Promise.resolve({ lessons: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } }));
    const removeLessonFn = vi.fn(() => Promise.resolve("lesson-1"));

    const scope = fork({
      handlers: [
        [lessonModel.removeLessonFx, removeLessonFn],
        [lessonModel.loadUpcomingLessonsFx, loadUpcomingFn],
      ],
      values: [
        [viewModeModel.$lessonsViewMode, "weekly"],
        [tabsModel.$currentTab, UPCOMING_TAB_INDEX],
      ],
    });

    await allSettled(lessonModel.removeLesson, {
      scope,
      params: { id: "lesson-1" },
    });

    expect(loadUpcomingFn).not.toHaveBeenCalled();
  });

  it("should NOT call loadUpcomingLessonsFx when in schedule mode", async () => {
    const loadUpcomingFn = vi.fn(() => Promise.resolve({ lessons: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } }));
    const removeLessonFn = vi.fn(() => Promise.resolve("lesson-1"));

    const scope = fork({
      handlers: [
        [lessonModel.removeLessonFx, removeLessonFn],
        [lessonModel.loadUpcomingLessonsFx, loadUpcomingFn],
      ],
      values: [
        [viewModeModel.$lessonsViewMode, "schedule"],
        [tabsModel.$currentTab, UPCOMING_TAB_INDEX],
      ],
    });

    await allSettled(lessonModel.removeLesson, {
      scope,
      params: { id: "lesson-1" },
    });

    expect(loadUpcomingFn).not.toHaveBeenCalled();
  });
});
