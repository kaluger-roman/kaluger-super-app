import { createEffect, createEvent, createStore, sample } from "effector";

import { studentsApi } from "@shared";

import * as studentModel from "./student.model";

export const studentsRefreshRequested = createEvent();

// Background refresh: the same two requests the page-level effects make, but
// deliberately outside $isStudentsLoading so a refetch triggered by an
// unrelated action does not raise the blocking overlay over the current page.
export const refreshStudentsSilentlyFx = createEffect(async (generation: number) => {
  const [active, archived] = await Promise.all([
    studentsApi.getAll(false),
    studentsApi.getAll(true),
  ]);

  return { active, archived, generation };
});

// Bumped by every mutation that patches the lists, so a slower background
// refetch can tell that its answer is already stale.
const $studentsGeneration = createStore(0);

sample({
  clock: [
    studentModel.addStudentFx.doneData,
    studentModel.updateStudentFx.doneData,
    studentModel.removeStudentFx.doneData,
    studentModel.archiveStudentFx.doneData,
    studentModel.unarchiveStudentFx.doneData,
  ],
  source: $studentsGeneration,
  fn: (generation) => generation + 1,
  target: $studentsGeneration,
});

sample({
  clock: studentsRefreshRequested,
  source: $studentsGeneration,
  target: refreshStudentsSilentlyFx,
});

// The refetch replaces both lists wholesale, so its answer is dropped when a
// mutation landed after the request went out.
sample({
  clock: refreshStudentsSilentlyFx.doneData,
  source: $studentsGeneration,
  filter: (generation, result) => result.generation === generation,
  fn: (_, { active }) => active,
  target: studentModel.$students,
});

sample({
  clock: refreshStudentsSilentlyFx.doneData,
  source: $studentsGeneration,
  filter: (generation, result) => result.generation === generation,
  fn: (_, { archived }) => archived,
  target: studentModel.$archivedStudents,
});
