import { createStore, createEvent, createEffect, sample } from "effector";

import type { Student, CreateStudentDto, UpdateStudentDto } from "@shared";
import { studentsApi } from "@shared";

// Events
export const loadStudents = createEvent();
export const loadStudent = createEvent<string>();
export const addStudent = createEvent<CreateStudentDto>();
export const updateStudent = createEvent<{
  id: string;
  data: UpdateStudentDto;
}>();
export const removeStudent = createEvent<string>();

// События для управления попапами
export const closeStudentDialog = createEvent();

// Effects
export const loadStudentsFx = createEffect(async () => {
  return await studentsApi.getAll();
});

export const loadStudentFx = createEffect(async (id: string) => {
  return await studentsApi.getById(id);
});

export const addStudentFx = createEffect(async (studentData: CreateStudentDto) => {
  return await studentsApi.create(studentData);
});

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
export const $students = createStore<Student[]>([]);

export const $currentStudent = createStore<Student | null>(null);

export const $isLoadStudent = loadStudentFx.pending;
export const $isAddStudent = addStudentFx.pending;
export const $isUpdateStudent = updateStudentFx.pending;
export const $isRemoveStudent = removeStudentFx.pending;

export const $isStudentsLoading = loadStudentsFx.pending;

// Connect events to effects
sample({
  clock: loadStudents,
  target: loadStudentsFx,
});

sample({
  clock: loadStudent,
  target: loadStudentFx,
});

sample({
  clock: addStudent,
  target: addStudentFx,
});

sample({
  clock: updateStudent,
  target: updateStudentFx,
});

sample({
  clock: removeStudent,
  target: removeStudentFx,
});

// Update stores
sample({
  clock: loadStudentsFx.doneData,
  target: $students,
});

sample({
  clock: addStudentFx.doneData,
  source: $students,
  fn: (students, newStudent) => [...students, newStudent],
  target: $students,
});

sample({
  clock: updateStudentFx.doneData,
  source: $students,
  fn: (students, updatedStudent) =>
    students.map((student) => (student.id === updatedStudent.id ? updatedStudent : student)),
  target: $students,
});

sample({
  clock: removeStudentFx.doneData,
  source: $students,
  fn: (students, removedId) => students.filter((student) => student.id !== removedId),
  target: $students,
});

sample({
  clock: loadStudentFx.doneData,
  target: $currentStudent,
});

sample({
  clock: updateStudentFx.doneData,
  source: $currentStudent,
  fn: (current, updated) => (current?.id === updated.id ? updated : current),
  target: $currentStudent,
});

sample({
  clock: removeStudentFx.doneData,
  fn: () => null,
  target: $currentStudent,
});

// Auto-reload students after CRUD operations
sample({
  clock: addStudentFx.doneData,
  target: loadStudentsFx,
});

sample({
  clock: updateStudentFx.doneData,
  target: loadStudentsFx,
});

sample({
  clock: removeStudentFx.doneData,
  target: loadStudentsFx,
});
