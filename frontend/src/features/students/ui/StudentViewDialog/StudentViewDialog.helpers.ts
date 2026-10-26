import type { Student } from "@shared";

import type { StartCallParams } from "../../../videoCall";

export const toStudentCall = (student: Student): StartCallParams => ({
  studentId: student.id,
  peerName: student.name,
  lesson: null,
});

// Only the student card starts a tutor call without a lesson.
export const isStudentCardCall = (call: StartCallParams): boolean =>
  "studentId" in call && call.lesson === null;
