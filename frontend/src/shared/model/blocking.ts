import { combine } from "effector";

// Combine pending states from important effects across the app.
// Import effect objects so we can use their `.pending` stores.
import {
  loadCompletedLessonsFx,
  loadLessonFx,
  loadUpcomingLessonsFx,
  addLessonFx,
  updateLessonFx,
  removeLessonFx,
} from "../../entities/lesson/model/lesson";
import {
  loadStudentsFx,
  loadStudentFx,
  addStudentFx,
  updateStudentFx,
  removeStudentFx,
} from "../../entities/student/model/student";
import { loadStatisticsFx } from "../../pages/ReportsPage/useReportsPage";

export const $isBlocking = combine(
  {
    loadCompletedLessons: loadCompletedLessonsFx.pending,
    loadLesson: loadLessonFx.pending,
    loadUpcomingLessons: loadUpcomingLessonsFx.pending,
    addLesson: addLessonFx.pending,
    updateLesson: updateLessonFx.pending,
    removeLesson: removeLessonFx.pending,
    loadStudents: loadStudentsFx.pending,
    loadStudent: loadStudentFx.pending,
    addStudent: addStudentFx.pending,
    updateStudent: updateStudentFx.pending,
    removeStudent: removeStudentFx.pending,
    loadStatistics: loadStatisticsFx.pending,
  },
  ({
    loadCompletedLessons,
    loadLesson,
    loadUpcomingLessons,
    addLesson,
    updateLesson,
    removeLesson,
    loadStudents,
    loadStudent,
    addStudent,
    updateStudent,
    removeStudent,
    loadStatistics,
  }) =>
    Boolean(
      loadCompletedLessons ||
        loadLesson ||
        loadUpcomingLessons ||
        addLesson ||
        updateLesson ||
        removeLesson ||
        loadStudents ||
        loadStudent ||
        addStudent ||
        updateStudent ||
        removeStudent ||
        loadStatistics
    )
);
