import { createStore, createEvent, createEffect } from "effector";
import {
  Lesson,
  lessonsApi,
  CreateLessonDto,
  UpdateLessonDto,
} from "../../../shared";
import { showSuccess, showError } from "../../../shared/model/notifications";

// Events
export const loadLessons = createEvent<{
  startDate?: string;
  endDate?: string;
  studentId?: string;
  status?: string;
  page?: number;
  limit?: number;
}>();
export const loadLesson = createEvent<string>();
export const loadUpcomingLessons = createEvent();
export const addLesson = createEvent<CreateLessonDto>();
export const updateLesson = createEvent<{
  id: string;
  data: UpdateLessonDto;
}>();
export const removeLesson = createEvent<{
  id: string;
  deleteAllFuture?: boolean;
}>();

// Effects
export const loadLessonsFx = createEffect(
  async (filters?: {
    startDate?: string;
    endDate?: string;
    studentId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    return await lessonsApi.getAll(filters);
  }
);

export const loadLessonFx = createEffect(async (id: string) => {
  return await lessonsApi.getById(id);
});

export const loadUpcomingLessonsFx = createEffect(async () => {
  return await lessonsApi.getUpcoming();
});

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
export const $lessons = createStore<Lesson[]>([])
  .on(loadLessonsFx.doneData, (_, { lessons }) => lessons)
  .on(addLessonFx.doneData, (lessons, newLesson) => [...lessons, newLesson])
  .on(updateLessonFx.doneData, (lessons, updatedLesson) =>
    lessons.map((lesson) =>
      lesson.id === updatedLesson.id ? updatedLesson : lesson
    )
  )
  .on(removeLessonFx.doneData, (lessons, removedId) =>
    lessons.filter((lesson) => lesson.id !== removedId)
  );

export const $upcomingLessons = createStore<Lesson[]>([]).on(
  loadUpcomingLessonsFx.doneData,
  (_, lessons) => lessons
);

export const $currentLesson = createStore<Lesson | null>(null)
  .on(loadLessonFx.doneData, (_, lesson) => lesson)
  .on(updateLessonFx.doneData, (current, updated) =>
    current?.id === updated.id ? updated : current
  )
  .reset(removeLessonFx.doneData);

export const $pagination = createStore({
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
}).on(loadLessonsFx.doneData, (_, { pagination }) => pagination);

export const $isLoading = createStore(false)
  .on(
    [
      loadLessonsFx,
      loadLessonFx,
      loadUpcomingLessonsFx,
      addLessonFx,
      updateLessonFx,
      removeLessonFx,
    ],
    () => true
  )
  .on(
    [
      loadLessonsFx.done,
      loadLessonFx.done,
      loadUpcomingLessonsFx.done,
      addLessonFx.done,
      updateLessonFx.done,
      removeLessonFx.done,
      loadLessonsFx.fail,
      loadLessonFx.fail,
      loadUpcomingLessonsFx.fail,
      addLessonFx.fail,
      updateLessonFx.fail,
      removeLessonFx.fail,
    ],
    () => false
  );

// Connect events to effects
loadLessons.watch(loadLessonsFx);
loadLesson.watch(loadLessonFx);
loadUpcomingLessons.watch(loadUpcomingLessonsFx);
addLesson.watch(addLessonFx);
updateLesson.watch(updateLessonFx);
removeLesson.watch(removeLessonFx);

// Auto-reload lessons after CRUD operations
addLessonFx.doneData.watch(() => {
  loadLessons({});
  showSuccess("Урок создан");
});

updateLessonFx.doneData.watch(() => {
  loadLessons({});
  showSuccess("Урок обновлен");
});

removeLessonFx.doneData.watch(() => {
  loadLessons({});
  showSuccess("Урок удален");
});

// Handle errors
addLessonFx.failData.watch((error: any) => {
  console.error("Add lesson error:", error);
  const message = error?.response?.data?.message || "Ошибка при создании урока";
  showError(message);
});

updateLessonFx.failData.watch((error: any) => {
  console.error("Update lesson error:", error);
  const message =
    error?.response?.data?.message || "Ошибка при обновлении урока";
  showError(message);
});

removeLessonFx.failData.watch((error: any) => {
  console.error("Remove lesson error:", error);
  const message = error?.response?.data?.message || "Ошибка при удалении урока";
  showError(message);
});
