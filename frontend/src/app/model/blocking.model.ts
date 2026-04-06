import { combine } from "effector";

import { lessonModel } from "@entities/lesson";
import { notificationsModel } from "@entities/notifications";
import { studentModel } from "@entities/student";
import { changeEmailModel } from "@features/changeEmail";
import { changePasswordModel } from "@features/changePassword";
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
    subscribePush: notificationsModel.subscribePushFx.pending,
    unsubscribePush: notificationsModel.unsubscribePushFx.pending,
    updateSettings: notificationsModel.updateSettingsFx.pending,
    changePassword: changePasswordModel.changePasswordFx.pending,
    changeEmail: changeEmailModel.changeEmailFx.pending,
    verifyEmailChange: changeEmailModel.verifyEmailChangeFx.pending,
    resendEmailChangeCode: changeEmailModel.resendEmailChangeCodeFx.pending,
  },
  (pending) => Boolean(Object.values(pending).some(Boolean))
);
