import { combine } from "effector";

import { lessonModel } from "@entities/lesson";
import { notificationsModel } from "@entities/notifications";
import { studentModel } from "@entities/student";
import { studentUserModel } from "@entities/studentUser";
import { taxRatePeriodModel } from "@entities/taxRatePeriod";
import { adminAuthModel, adminDataModel } from "@features/admin";
import { changeEmailModel } from "@features/changeEmail";
import { changePasswordModel } from "@features/changePassword";
import { forgotPasswordModel } from "@features/forgotPassword";
import { lessonCancellationModel } from "@features/lessons";
import { resetPasswordModel } from "@features/resetPassword";
import {
  studentEmailVerificationModel,
  studentInviteModel,
  studentLoginModel,
} from "@features/studentAuth";
import { studentScheduleModel } from "@features/studentSchedule";
import { taxRatePeriodsModalModel } from "@features/taxRatePeriods";
import { tutorStudentInvitationModel } from "@features/tutorStudentInvitation";
import { financesModel, profileModel } from "@pages/profile";
import { statisticsModel } from "@pages/ReportsPage";

export const $isBlocking = combine(
  {
    loadCompletedLessons: lessonModel.loadCompletedLessonsFx.pending,
    loadLesson: lessonModel.loadLessonFx.pending,
    loadUpcomingLessons: lessonModel.loadUpcomingLessonsFx.pending,
    addLesson: lessonModel.addLessonFx.pending,
    updateLesson: lessonModel.updateLessonFx.pending,
    removeLesson: lessonModel.removeLessonFx.pending,
    cancellationInfo: lessonCancellationModel.getCancellationInfoFx.pending,
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
    forgotPassword: forgotPasswordModel.forgotPasswordFx.pending,
    verifyResetToken: resetPasswordModel.verifyResetTokenFx.pending,
    resetPassword: resetPasswordModel.resetPasswordFx.pending,
    adminLogin: adminAuthModel.loginFx.pending,
    adminOverview: adminDataModel.getOverviewFx.pending,
    adminBackupSettings: adminDataModel.getBackupSettingsFx.pending,
    adminUpdateBackup: adminDataModel.updateBackupSettingsFx.pending,
    adminCreateBackup: adminDataModel.createBackupFx.pending,
    loadTaxRatePeriods: taxRatePeriodModel.loadPeriodsFx.pending,
    saveTaxRatePeriods: taxRatePeriodsModalModel.savePeriodsFx.pending,
    setTaxEnabled: financesModel.setTaxEnabledFx.pending,
    studentLogin: studentLoginModel.studentLoginFx.pending,
    studentLogout: studentUserModel.studentLogoutFx.pending,
    studentGetCurrent: studentUserModel.getCurrentStudentFx.pending,
    studentVerifyEmail: studentEmailVerificationModel.verifyEmailFx.pending,
    studentResendVerification:
      studentEmailVerificationModel.resendVerificationFx.pending,
    studentValidateInvitation:
      studentInviteModel.validateInvitationTokenFx.pending,
    studentRegister: studentInviteModel.registerStudentByInviteFx.pending,
    studentLoadLessons: studentScheduleModel.loadLessonsFx.pending,
    tutorInvitationLoadStatus:
      tutorStudentInvitationModel.loadStatusFx.pending,
    tutorInvitationIssue:
      tutorStudentInvitationModel.issueInvitationFx.pending,
    tutorInvitationRevoke:
      tutorStudentInvitationModel.revokeInvitationFx.pending,
  },
  (pending) => Boolean(Object.values(pending).some(Boolean))
);
