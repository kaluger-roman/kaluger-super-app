import { createStore, createEvent, createEffect } from "effector";
import {
  Student,
  studentsApi,
  CreateStudentDto,
  UpdateStudentDto,
} from "../../../shared";
import { showSuccess, showError } from "../../../shared/model/notifications";
import { loadUpcomingLessons } from "../../lesson/model/lesson";

// Events
export const loadStudents = createEvent();
export const loadStudent = createEvent<string>();
export const addStudent = createEvent<CreateStudentDto>();
export const updateStudent = createEvent<{
  id: string;
  data: UpdateStudentDto;
}>();
export const removeStudent = createEvent<string>();

// Effects
export const loadStudentsFx = createEffect(async () => {
  return await studentsApi.getAll();
});

export const loadStudentFx = createEffect(async (id: string) => {
  return await studentsApi.getById(id);
});

export const addStudentFx = createEffect(
  async (studentData: CreateStudentDto) => {
    return await studentsApi.create(studentData);
  }
);

export const updateStudentFx = createEffect(
  async ({ id, data }: { id: string; data: UpdateStudentDto }) => {
    return await studentsApi.update(id, data);
  }
);

export const removeStudentFx = createEffect(async (id: string) => {
  await studentsApi.delete(id);
  return id;
});

// Stores
export const $students = createStore<Student[]>([])
  .on(loadStudentsFx.doneData, (_, students) => students)
  .on(addStudentFx.doneData, (students, newStudent) => [
    ...students,
    newStudent,
  ])
  .on(updateStudentFx.doneData, (students, updatedStudent) =>
    students.map((student) =>
      student.id === updatedStudent.id ? updatedStudent : student
    )
  )
  .on(removeStudentFx.doneData, (students, result) =>
    students.filter((student) => student.id !== result)
  );

export const $currentStudent = createStore<Student | null>(null)
  .on(loadStudentFx.doneData, (_, student) => student)
  .on(updateStudentFx.doneData, (current, updated) =>
    current?.id === updated.id ? updated : current
  )
  .reset(removeStudentFx.doneData);

export const $isLoading = createStore(false)
  .on(
    [
      loadStudentsFx,
      loadStudentFx,
      addStudentFx,
      updateStudentFx,
      removeStudentFx,
    ],
    () => true
  )
  .on(
    [
      loadStudentsFx.done,
      loadStudentFx.done,
      addStudentFx.done,
      updateStudentFx.done,
      removeStudentFx.done,
      loadStudentsFx.fail,
      loadStudentFx.fail,
      addStudentFx.fail,
      updateStudentFx.fail,
      removeStudentFx.fail,
    ],
    () => false
  );

// Connect events to effects
loadStudents.watch(loadStudentsFx);
loadStudent.watch(loadStudentFx);
addStudent.watch(addStudentFx);
updateStudent.watch(updateStudentFx);
removeStudent.watch(removeStudentFx);

// Auto-reload students after CRUD operations
addStudentFx.doneData.watch(() => {
  loadStudents();
  showSuccess("Ученик добавлен");
});

updateStudentFx.doneData.watch(() => {
  loadStudents();
  showSuccess("Ученик обновлен");
});

removeStudentFx.doneData.watch(() => {
  loadStudents();
  loadUpcomingLessons();
  showSuccess("Ученик удален");
});

// Handle errors
addStudentFx.failData.watch((error: any) => {
  console.error("Add student error:", error);
  showError(error?.response?.data?.error || "Ошибка при добавлении студента");
});

updateStudentFx.failData.watch((error: any) => {
  console.error("Update student error:", error);
  showError(error?.response?.data?.error || "Ошибка при обновлении студента");
});

removeStudentFx.failData.watch((error: any) => {
  console.error("Remove student error:", error);
  showError(error?.response?.data?.error || "Ошибка при удалении студента");
});
