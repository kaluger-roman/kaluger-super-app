import type { ReminderSettings } from "@entities";
import type { StudentSession } from "@shared/types";

import type {
  CallPreviewConfig,
  MockCameraPalette,
  MockupLink,
  ToastPreviewConfig,
} from "./CallBackgroundMockupPage.types";

const CAMERA_ON = { micOn: true, cameraOn: true, screenSharing: false, cameraAvailable: true };

const TUTOR_VIEW: CallPreviewConfig = {
  role: "tutor",
  peerName: "Маша Соколова",
  peerRole: "student",
  peerMedia: CAMERA_ON,
  selfMedia: CAMERA_ON,
  screenShareSupported: true,
};

const STUDENT_VIEW: CallPreviewConfig = {
  role: "student",
  peerName: "Анна Сергеевна",
  peerRole: "tutor",
  peerMedia: CAMERA_ON,
  selfMedia: CAMERA_ON,
  screenShareSupported: false,
};

// Keys match the call feature's callBackgroundMock states.
export const CALL_PREVIEWS: Partial<Record<string, CallPreviewConfig>> = {
  "tutor-minimized": TUTOR_VIEW,
  "tutor-mic-suspended": TUTOR_VIEW,
  "tutor-reconnecting": TUTOR_VIEW,
  "student-background": STUDENT_VIEW,
  "student-reconnecting": STUDENT_VIEW,
  hint: STUDENT_VIEW,
  "sound-blocked": STUDENT_VIEW,
};

// Mirrors PEER_NOT_RETURNED_TEXT / CALL_ENDED_TEXT / CALL_ALREADY_ENDED_TEXT in call.constants.ts.
export const TOAST_PREVIEWS: Partial<Record<string, ToastPreviewConfig>> = {
  "toast-not-returned": {
    frameTitle: "Репетитор",
    pageTitle: "Главная",
    message: "Собеседник не вернулся в звонок",
    type: "error",
  },
  "toast-call-ended": {
    frameTitle: "Кабинет ученика",
    pageTitle: "Расписание",
    message: "Звонок завершён",
    type: "info",
  },
  "toast-already-ended": {
    frameTitle: "Кабинет ученика",
    pageTitle: "Расписание",
    message: "Звонок уже завершён",
    type: "info",
  },
};

export const CABINET_STATES = ["cabinet-invite", "cabinet-ios", "cabinet-denied"];
export const STUDENT_SETTINGS_STATES = ["student-settings-on", "student-settings-off"];
export const TUTOR_SETTINGS_STATE = "tutor-settings";

export const MOCK_CALL_DURATION_SECONDS = 754;

export const PEER_CAMERA_PALETTE: MockCameraPalette = {
  wall: ["#d9cbb5", "#9c8f7c"],
  shirt: "#3f5d7d",
  skin: "#e2b99a",
  hair: "#4a3326",
};

export const SELF_CAMERA_PALETTE: MockCameraPalette = {
  wall: ["#b8c7c2", "#6f8580"],
  shirt: "#7a4d5c",
  skin: "#d6a888",
  hair: "#2b211c",
};

export const MOCK_STUDENT_SESSION: StudentSession = {
  id: "mock-student",
  email: "masha.sokolova@example.com",
  name: "Маша Соколова",
  isEmailVerified: true,
  tutor: { name: "Анна Сергеевна" },
};

export const MOCK_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  intervals: [15, 60],
  muteWhenInLesson: true,
};

export const MOCKUP_LINKS: MockupLink[] = [
  { state: "tutor-minimized", title: "Репетитор: ученик свернул приложение" },
  { state: "tutor-mic-suspended", title: "Репетитор: микрофон ученика приостановлен" },
  { state: "tutor-reconnecting", title: "Репетитор: восстанавливаем связь" },
  { state: "student-background", title: "Ученик: репетитор недоступен (нейтрально)" },
  { state: "student-reconnecting", title: "Ученик: восстанавливаем связь" },
  { state: "hint", title: "Подсказка про iPhone" },
  { state: "sound-blocked", title: "Кнопка «Нажмите, чтобы включить звук»" },
  { state: "toast-not-returned", title: "Сообщение «Собеседник не вернулся в звонок»" },
  { state: "toast-call-ended", title: "Сообщение «Звонок завершён»" },
  { state: "toast-already-ended", title: "Сообщение «Звонок уже завершён»" },
  { state: "cabinet-invite", title: "Кабинет: карточка «Включить»" },
  { state: "cabinet-ios", title: "Кабинет: инструкция для iPhone" },
  { state: "cabinet-denied", title: "Кабинет: уведомления запрещены" },
  { state: "student-settings-on", title: "Настройки ученика: включены" },
  { state: "student-settings-off", title: "Настройки ученика: выключены" },
  { state: TUTOR_SETTINGS_STATE, title: "Настройки репетитора: уведомления о звонках" },
];
