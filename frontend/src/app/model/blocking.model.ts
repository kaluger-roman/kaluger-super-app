import { combine } from "effector";

import { lessonModel } from "@entities/lesson";
import { studentModel } from "@entities/student";
import { profileModel } from "@pages/profile";
import { statisticsModel } from "@pages/ReportsPage";

export const $isBlocking = combine(
  {
    loadCompletedLessons: lessonModel.loadCompletedLessonsFx.pending,
    loadLesson: lessonModel.loadLessonFx.pending,
    loadUpcomingLessons: lessonModel.loadUpcomingLessonsFx.pending,
    addLesson: lessonModel.addLessonFx.pending,
    updateLesson: lessonModel.updateLessonFx.pending,
    removeLesson: lessonModel.removeLessonFx.pending,
    loadStudents: studentModel.$isStudentsLoading,
    loadStudent: studentModel.loadStudentFx.pending,
    addStudent: studentModel.addStudentFx.pending,
    updateStudent: studentModel.updateStudentFx.pending,
    removeStudent: studentModel.removeStudentFx.pending,
    loadStatistics: statisticsModel.loadStatisticsFx.pending,
    updateProfile: profileModel.updateProfileFx.pending,
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
    updateProfile,
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
        loadStatistics ||
        updateProfile
    )
);
