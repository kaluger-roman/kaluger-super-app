import type { ContactMethod, Subject, LessonType } from "./types";

export const CONTACT_METHOD_LABELS: Record<ContactMethod, string> = {
  WHATSAPP: "WhatsApp",
  TELEGRAM: "Telegram",
  MAX: "MAX",
};

export const SUBJECT_LABELS: Record<Subject, string> = {
  MATHEMATICS: "Математика",
  PHYSICS: "Физика",
};

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  EGE: "ЕГЭ",
  OGE: "ОГЭ",
  OLYMPICS: "Олимпиады",
  SCHOOL: "Школа",
};

export const EMAIL_VERIFICATION_CODE_LENGTH = 6;
