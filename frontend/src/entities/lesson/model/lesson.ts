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

// Хранилище для данных расписания с группировкой по дням
export const $scheduleLessons = createStore<Record<string, Lesson[]>>({})
  .on(loadScheduleLessonsFx.doneData, (state, { lessons }) => {
    // Группируем уроки по дням
    const lessonsByDay: Record<string, Lesson[]> = {};
    lessons.forEach((lesson) => {
      const dateKey = new Date(lesson.startTime).toISOString().split("T")[0];
      if (!lessonsByDay[dateKey]) {
        lessonsByDay[dateKey] = [];
      }
      lessonsByDay[dateKey].push(lesson);
    });

    // Объединяем с существующими данными
    return { ...state, ...lessonsByDay };
  })
  .on(addLessonFx.doneData, (state, newLesson) => {
    const dateKey = new Date(newLesson.startTime).toISOString().split("T")[0];
    const dayLessons = state[dateKey] || [];
    return {
      ...state,
      [dateKey]: [...dayLessons, newLesson],
    };
  })
  .on(updateLessonFx.doneData, (state, updatedLesson) => {
    const dateKey = new Date(updatedLesson.startTime)
      .toISOString()
      .split("T")[0];
    const dayLessons = state[dateKey] || [];
    const updatedDayLessons = dayLessons.map((lesson) =>
      lesson.id === updatedLesson.id ? updatedLesson : lesson
    );
    return {
      ...state,
      [dateKey]: updatedDayLessons,
    };
  })
  .on(removeLessonFx.doneData, (state, removedId) => {
    const newState = { ...state };
    Object.keys(newState).forEach((dateKey) => {
      newState[dateKey] = newState[dateKey].filter(
        (lesson) => lesson.id !== removedId
      );
      if (newState[dateKey].length === 0) {
        delete newState[dateKey];
      }
    });
    return newState;
  });

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
      loadScheduleLessonsFx,
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
      loadScheduleLessonsFx.done,
      addLessonFx.done,
      updateLessonFx.done,
      removeLessonFx.done,
      loadCompletedLessonsFx.fail,
      loadCancelledLessonsFx.fail,
      loadLessonFx.fail,
      loadUpcomingLessonsFx.fail,
      loadWeeklyLessonsFx.fail,
      loadScheduleLessonsFx.fail,
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
loadScheduleLessons.watch(loadScheduleLessonsFx);
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

  if (lessonsViewMode === "schedule") {
    // Для режима расписания перезагружаем только текущий видимый диапазон
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 15);
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + 15);

    loadScheduleLessons({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      noPagination: "true",
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
