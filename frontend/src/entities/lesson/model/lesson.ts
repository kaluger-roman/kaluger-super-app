import { createStore, createEvent, createEffect } from "effector";
import {
  Lesson,
  lessonsApi,
  CreateLessonDto,
  UpdateLessonDto,
} from "../../../shared";
import { showSuccess, showError } from "../../../shared/model/notifications";
import {
  $currentWeek,
  $lessonsViewMode,
} from "../../../pages/lessons/model/viewMode";
import {
  $onlyUnpaid,
  $onlyWithoutHomework,
} from "../../../pages/lessons/model/filters";

// Events
export type LoadPagedFilters = {
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
export const addLesson = createEvent<CreateLessonDto>();
export const updateLesson = createEvent<{
  id: string;
  data: UpdateLessonDto;
}>();
export const removeLesson = createEvent<{
  id: string;
  deleteAllFuture?: boolean;
}>();

// События для управления попапами
export const closeLessonDialog = createEvent();

// Effects
export const loadCompletedLessonsFx = createEffect(
  async (filters?: LoadPagedFilters) => {
    return await lessonsApi.getAll({
      ...filters,
      status: "COMPLETED",
    });
  }
);

export const loadCancelledLessonsFx = createEffect(
  async (filters?: LoadPagedFilters) => {
    return await lessonsApi.getAll({
      ...filters,
      status: "CANCELLED",
    });
  }
);

export const loadLessonFx = createEffect(async (id: string) => {
  return await lessonsApi.getById(id);
});

export const loadUpcomingLessonsFx = createEffect(
  async (filters?: LoadPagedFilters) => {
    return await lessonsApi.getUpcoming(filters);
  }
);

export const loadWeeklyLessonsFx = createEffect(
  async (filters: {
    weekStart: string;
    onlyUnpaid?: boolean;
    onlyWithoutHomework?: boolean;
  }) => {
    return await lessonsApi.getByWeek(filters);
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
  async ({
    id,
    deleteAllFuture,
  }: {
    id: string;
    deleteAllFuture?: boolean;
  }) => {
    await lessonsApi.delete(id, deleteAllFuture);
    return id;
  }
);

// Stores
export const $completedLessons = createStore<Lesson[]>([]).on(
  loadCompletedLessonsFx.doneData,
  (_, { lessons }) => lessons
);

export const $cancelledLessons = createStore<Lesson[]>([]).on(
  loadCancelledLessonsFx.doneData,
  (_, { lessons }) => lessons
);

export const $upcomingLessons = createStore<Lesson[]>([])
  .on(loadUpcomingLessonsFx.doneData, (_, { lessons }) => lessons)
  .on(addLessonFx.doneData, (lessons, newLesson) => [...lessons, newLesson])
  .on(updateLessonFx.doneData, (lessons, updatedLesson) =>
    lessons.map((lesson) =>
      lesson.id === updatedLesson.id ? updatedLesson : lesson
    )
  )
  .on(removeLessonFx.doneData, (lessons, removedId) =>
    lessons.filter((lesson) => lesson.id !== removedId)
  );

export const $weeklyLessons = createStore<Lesson[]>([]).on(
  loadWeeklyLessonsFx.doneData,
  (_, { lessons }) => lessons
);

export const $currentLesson = createStore<Lesson | null>(null)
  .on(loadLessonFx.doneData, (_, lesson) => lesson)
  .on(updateLessonFx.doneData, (current, updated) =>
    current?.id === updated.id ? updated : current
  )
  .reset(removeLessonFx.doneData);

export const $completedPagination = createStore({
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
}).on(loadCompletedLessonsFx.doneData, (_, { pagination }) => pagination);

export const $cancelledPagination = createStore({
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
}).on(loadCancelledLessonsFx.doneData, (_, { pagination }) => pagination);

export const $upcomingPagination = createStore({
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
}).on(loadUpcomingLessonsFx.doneData, (_, { pagination }) => pagination);

export const $isLoading = createStore(false)
  .on(
    [
      loadCompletedLessonsFx,
      loadCancelledLessonsFx,
      loadLessonFx,
      loadUpcomingLessonsFx,
      loadWeeklyLessonsFx,
      addLessonFx,
      updateLessonFx,
      removeLessonFx,
    ],
    () => true
  )
  .on(
    [
      loadCompletedLessonsFx.done,
      loadCancelledLessonsFx.done,
      loadLessonFx.done,
      loadUpcomingLessonsFx.done,
      loadWeeklyLessonsFx.done,
      addLessonFx.done,
      updateLessonFx.done,
      removeLessonFx.done,
      loadCompletedLessonsFx.fail,
      loadCancelledLessonsFx.fail,
      loadLessonFx.fail,
      loadUpcomingLessonsFx.fail,
      loadWeeklyLessonsFx.fail,
      addLessonFx.fail,
      updateLessonFx.fail,
      removeLessonFx.fail,
    ],
    () => false
  );

// Connect events to effects
loadCompletedLessons.watch(loadCompletedLessonsFx);
loadCancelledLessons.watch(loadCancelledLessonsFx);
loadLesson.watch(loadLessonFx);
loadUpcomingLessons.watch(loadUpcomingLessonsFx);
loadWeeklyLessons.watch(loadWeeklyLessonsFx);
addLesson.watch(addLessonFx);
updateLesson.watch(updateLessonFx);
removeLesson.watch(removeLessonFx);

// Auto-reload lessons after CRUD operations
addLessonFx.doneData.watch(() => {
  const { page, limit } = $upcomingPagination.getState();
  loadUpcomingLessons({
    page,
    limit,
    onlyUnpaid: $onlyUnpaid.getState(),
    onlyWithoutHomework: $onlyWithoutHomework.getState(),
  });
  showSuccess("Урок создан");
  closeLessonDialog();
});

updateLessonFx.doneData.watch(() => {
  const upcomingPagination = $upcomingPagination.getState();
  const completedPagination = $completedPagination.getState();
  const cancelledPagination = $cancelledPagination.getState();
  const lessonsViewMode = $lessonsViewMode.getState();

  if (lessonsViewMode === "weekly") {
    loadWeeklyLessons({
      weekStart: $currentWeek.getState().toISOString() || "",
      onlyUnpaid: $onlyUnpaid.getState(),
      onlyWithoutHomework: $onlyWithoutHomework.getState(),
    });
  }

  if (lessonsViewMode === "paged") {
    loadUpcomingLessons({
      page: upcomingPagination.page,
      limit: upcomingPagination.limit,
      onlyUnpaid: $onlyUnpaid.getState(),
      onlyWithoutHomework: $onlyWithoutHomework.getState(),
    });
    loadCompletedLessons({
      page: completedPagination.page,
      limit: completedPagination.limit,
      onlyUnpaid: $onlyUnpaid.getState(),
      onlyWithoutHomework: $onlyWithoutHomework.getState(),
    });
    loadCancelledLessons({
      page: cancelledPagination.page,
      limit: cancelledPagination.limit,
      onlyUnpaid: $onlyUnpaid.getState(),
      onlyWithoutHomework: $onlyWithoutHomework.getState(),
    });
  }

  showSuccess("Урок обновлен");
  closeLessonDialog();
});

removeLessonFx.doneData.watch(() => {
  const { page, limit } = $upcomingPagination.getState();
  loadUpcomingLessons({
    page,
    limit,
    onlyUnpaid: $onlyUnpaid.getState(),
    onlyWithoutHomework: $onlyWithoutHomework.getState(),
  });
  showSuccess("Урок удален");
  closeLessonDialog();
});

// Handle errors
addLessonFx.failData.watch((error: any) => {
  console.error("Add lesson error:", error);
  const message = error?.response?.data?.error || "Ошибка при создании урока";
  showError(message);
});

updateLessonFx.failData.watch((error: any) => {
  console.error("Update lesson error:", error);
  const message = error?.response?.data?.error || "Ошибка при обновлении урока";
  showError(message);
});

removeLessonFx.failData.watch((error: any) => {
  console.error("Remove lesson error:", error);
  const message = error?.response?.data?.error || "Ошибка при удалении урока";
  showError(message);
});
