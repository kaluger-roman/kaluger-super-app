import { sample } from "effector";

import { studentModel, lessonModel } from "@entities";
import { lessonsModel } from "@features/lessons";
import { extractAxiosError } from "@shared";
import { notificationsModel } from "@shared/model";

sample({
  clock: studentModel.addStudentFx.doneData,
  fn: () => "Ученик добавлен",
  target: notificationsModel.showSuccessEvent,
});

sample({
  clock: studentModel.addStudentFx.doneData,
  target: studentModel.closeStudentDialog,
});

sample({
  clock: studentModel.updateStudentFx.doneData,
  fn: () => "Ученик обновлен",
  target: notificationsModel.showSuccessEvent,
});

sample({
  clock: studentModel.updateStudentFx.doneData,
  target: studentModel.closeStudentDialog,
});

sample({
  clock: studentModel.removeStudentFx.doneData,
  source: {
    onlyUnpaid: lessonsModel.$onlyUnpaid,
    onlyWithoutHomework: lessonsModel.$onlyWithoutHomework,
  },
  fn: ({ onlyUnpaid, onlyWithoutHomework }) => ({
    onlyUnpaid,
    onlyWithoutHomework,
  }),
  target: lessonModel.loadUpcomingLessonsFx,
});

sample({
  clock: studentModel.removeStudentFx.doneData,
  fn: () => "Ученик удален",
  target: notificationsModel.showSuccessEvent,
});

sample({
  clock: studentModel.removeStudentFx.doneData,
  target: studentModel.closeStudentDialog,
});

sample({
  clock: studentModel.addStudentFx.failData,
  fn: (error) => extractAxiosError(error, "Ошибка при добавлении студента"),
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: studentModel.updateStudentFx.failData,
  fn: (error) => extractAxiosError(error, "Ошибка при обновлении студента"),
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: studentModel.removeStudentFx.failData,
  fn: (error) => extractAxiosError(error, "Ошибка при удалении студента"),
  target: notificationsModel.showErrorEvent,
});
