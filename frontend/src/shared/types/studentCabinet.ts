import type { LessonStatus, Subject } from "./lesson";

export type StudentSession = {
  id: string;
  email: string;
  name: string;
  isEmailVerified: boolean;
  tutor: { name: string } | null;
};

export type StudentRegisterByInviteRequest = {
  token: string;
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

export type StudentLoginRequest = {
  email: string;
  password: string;
};

export type StudentAuthResponse = {
  token: string;
  student: StudentSession;
};

export type StudentVisibleLesson = {
  id: string;
  subject: Subject;
  startTime: string;
  endTime: string;
  status: LessonStatus;
};

export type StudentLessonsByWeekResponse = {
  weekStart: string;
  lessons: StudentVisibleLesson[];
};

export type IssuedInvitationResponse = {
  inviteUrl: string;
  expiresAt: string;
  status: "pending";
};

export type InvitationStatusResponse =
  | { status: "not_issued" }
  | { status: "pending"; createdAt: string; expiresAt: string }
  | { status: "registered"; registeredAt: string; studentEmail: string };

export type ValidateInvitationResponse =
  | { valid: true; studentName: string; tutorName: string }
  | { valid: false };

export type StudentLessonWsEvent =
  | { type: "lesson_created"; lesson: StudentVisibleLesson }
  | { type: "lesson_updated"; lesson: StudentVisibleLesson }
  | { type: "lesson_deleted"; lessonId: string }
  | {
      type: "lesson_status_updated";
      lessonId: string;
      status: LessonStatus;
    };
