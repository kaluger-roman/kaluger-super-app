import { createStore, createEvent, createEffect, sample } from "effector";

import type { Lesson, CreateLessonDto, UpdateLessonDto } from "@shared";
import { lessonsApi } from "@shared";

type LoadPagedFilters = {
  page?: number;
  limit?: number;
  onlyUnpaid?: boolean;
  onlyWithoutHomework?: boolean;
};

export const loadCompletedLessons = createEvent<LoadPagedFilters>();
export const loadCancelledLessons = createEvent<LoadPagedFilters>();
export const loadLesson = createEvent<string>();
export const loadUpcomingLessons = createEvent<LoadPagedFilters>();
export const loadWeeklyLessons = createEvent<{
  weekStart: string;
  onlyUnpaid?: boolean;
  onlyWithoutHomework?: boolean;
}>();
export const loadScheduleLessons = createEvent<{
  startDate: string;
  endDate: string;
  noPagination?: string;
}>();
export const addLesson = createEvent<CreateLessonDto>();
export const updateLesson = createEvent<{
  id: string;
  data: UpdateLessonDto;
}>();
export const removeLesson = createEvent<{
  id: string;
  deleteAllFuture?: boolean;
}>();

export const closeLessonDialog = createEvent();

export const loadCompletedLessonsFx = createEffect(async (filters?: LoadPagedFilters) => {
  return await lessonsApi.getAll({
    ...filters,
    status: "COMPLETED",
  });
});

export const loadCancelledLessonsFx = createEffect(async (filters?: LoadPagedFilters) => {
  return await lessonsApi.getAll({
    ...filters,
    status: "CANCELLED",
  });
});

export const loadLessonFx = createEffect(async (id: string) => {
  return await lessonsApi.getById(id);
});

export const loadUpcomingLessonsFx = createEffect(async (filters?: LoadPagedFilters) => {
  return await lessonsApi.getUpcoming(filters);
});

export const loadWeeklyLessonsFx = createEffect(
  async (filters: { weekStart: string; onlyUnpaid?: boolean; onlyWithoutHomework?: boolean }) => {
    return await lessonsApi.getByWeek(filters);
  }
);

export const loadScheduleLessonsFx = createEffect(
  async (filters: { startDate: string; endDate: string }) => {
    return await lessonsApi.getByDateRange(filters);
  }
);

export const addLessonFx = createEffect(async (lessonData: CreateLessonDto) => {
  return await lessonsApi.create(lessonData);
});

export const updateLessonFx = createEffect(
  async ({ id, data }: { id: string; data: UpdateLessonDto }) => {
    return await lessonsApi.update(id, data);
  }
);

export const removeLessonFx = createEffect(
  async ({ id, deleteAllFuture }: { id: string; deleteAllFuture?: boolean }) => {
    await lessonsApi.delete(id, deleteAllFuture);
    return id;
  }
);

export const $completedLessons = createStore<Lesson[]>([]);
export const $cancelledLessons = createStore<Lesson[]>([]);
export const $upcomingLessons = createStore<Lesson[]>([]);
export const $weeklyLessons = createStore<Lesson[]>([]);

export const $scheduleLessons = createStore<Record<string, Lesson[]>>({});
export const $currentLesson = createStore<Lesson | null>(null);
export const $completedPagination = createStore({
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
});
export const $cancelledPagination = createStore({
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
});
export const $upcomingPagination = createStore({
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
});
export const $lessonApiIsLoading = createStore(false);

sample({
  clock: loadCompletedLessons,
  target: loadCompletedLessonsFx,
});

sample({
  clock: loadCancelledLessons,
  target: loadCancelledLessonsFx,
});

sample({
  clock: loadLesson,
  target: loadLessonFx,
});

sample({
  clock: loadUpcomingLessons,
  target: loadUpcomingLessonsFx,
});

sample({
  clock: loadWeeklyLessons,
  target: loadWeeklyLessonsFx,
});

sample({
  clock: loadScheduleLessons,
  target: loadScheduleLessonsFx,
});

sample({
  clock: addLesson,
  target: addLessonFx,
});

sample({
  clock: updateLesson,
  target: updateLessonFx,
});

sample({
  clock: removeLesson,
  target: removeLessonFx,
});
