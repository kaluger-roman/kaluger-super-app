import { sample } from "effector";

import { lessonModel } from "@entities";
import { extractAxiosErrorMessage } from "@shared";
import { notificationsModel } from "@shared/model";

sample({
  clock: lessonModel.addLessonFx.doneData,
  fn: () => "Урок создан",
  target: notificationsModel.showSuccessEvent,
});

sample({
  clock: lessonModel.updateLessonFx.doneData,
  fn: () => "Урок обновлен",
  target: notificationsModel.showSuccessEvent,
});

sample({
  clock: lessonModel.removeLessonFx.doneData,
  fn: () => "Урок удален",
  target: notificationsModel.showSuccessEvent,
});

sample({
  clock: lessonModel.addLessonFx.failData,
  fn: (error) => extractAxiosErrorMessage(error, "Ошибка при создании урока"),
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: lessonModel.updateLessonFx.failData,
  fn: (error) => extractAxiosErrorMessage(error, "Ошибка при обновлении урока"),
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: lessonModel.removeLessonFx.failData,
  fn: (error) => extractAxiosErrorMessage(error, "Ошибка при удалении урока"),
  target: notificationsModel.showErrorEvent,
});
