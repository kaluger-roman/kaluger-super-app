import { createStore, createEvent, createEffect, sample, combine } from "effector";

import type { Student, CreateStudentDto, UpdateStudentDto, ArchiveReason } from "@shared";
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
export const archiveStudent = createEvent<{
  id: string;
  archiveReason?: ArchiveReason;
  archiveComment?: string;
}>();
export const unarchiveStudent = createEvent<string>();

// События для управления попапами
export const closeStudentDialog = createEvent();

export const loadActiveStudentsFx = createEffect(async () => {
  return await studentsApi.getAll(false);
});

export const loadArchivedStudentsFx = createEffect(async () => {
  return await studentsApi.getAll(true);
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

export const archiveStudentFx = createEffect(
  async (data: { id: string; archiveReason?: ArchiveReason; archiveComment?: string }) => {
    return await studentsApi.archive(data.id, {
      archiveReason: data.archiveReason,
      archiveComment: data.archiveComment,
    });
  }
);

export const unarchiveStudentFx = createEffect(async (id: string) => {
  return await studentsApi.unarchive(id);
});

// Stores
export const $students = createStore<Student[]>([]);
export const $archivedStudents = createStore<Student[]>([]);

export const $currentStudent = createStore<Student | null>(null);

export const $isLoadStudent = loadStudentFx.pending;
export const $isAddStudent = addStudentFx.pending;
export const $isUpdateStudent = updateStudentFx.pending;
export const $isRemoveStudent = removeStudentFx.pending;
export const $isArchiveStudent = archiveStudentFx.pending;
export const $isUnarchiveStudent = unarchiveStudentFx.pending;

export const $isStudentsLoading = combine(
  archiveStudentFx.pending,
  unarchiveStudentFx.pending,
  (isArchiving, isUnarchiving) => isArchiving || isUnarchiving
);

sample({
  clock: loadStudents,
  target: [loadArchivedStudentsFx, loadActiveStudentsFx],
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

sample({
  clock: archiveStudent,
  target: archiveStudentFx,
});

sample({
  clock: unarchiveStudent,
  target: unarchiveStudentFx,
});

// Update stores
sample({
  clock: loadActiveStudentsFx.doneData,
  target: $students,
});

sample({
  clock: loadArchivedStudentsFx.doneData,
  target: $archivedStudents,
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

sample({
  clock: archiveStudentFx.doneData,
  source: $students,
  fn: (students, archivedStudent) =>
    students.filter((student) => student.id !== archivedStudent.id),
  target: $students,
});

sample({
  clock: archiveStudentFx.doneData,
  source: $archivedStudents,
  fn: (archivedStudents, archivedStudent) => [...archivedStudents, archivedStudent],
  target: $archivedStudents,
});

sample({
  clock: unarchiveStudentFx.doneData,
  source: $students,
  fn: (students, unarchivedStudent) => [...students, unarchivedStudent],
  target: $students,
});

sample({
  clock: unarchiveStudentFx.doneData,
  source: $archivedStudents,
  fn: (archivedStudents, unarchivedStudent) =>
    archivedStudents.filter((student) => student.id !== unarchivedStudent.id),
  target: $archivedStudents,
});
