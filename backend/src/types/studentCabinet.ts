import type { Request } from "express";

export type StudentJwtPayload = {
  studentUserId: string;
  email: string;
  isStudent: true;
  tokenVersion: number;
};

export type StudentRequest = Request & {
  studentUser?: StudentJwtPayload;
};

export type StudentRegisterByInviteDto = {
  token: string;
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

export type StudentLoginDto = {
  email: string;
  password: string;
};

export type StudentVerifyEmailDto = {
  code: string;
};

export type StudentSettingsResponse = {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  tutor: { name: string } | null;
};

export type StudentAuthResponse = {
  token: string;
  student: StudentSettingsResponse;
};

export type StudentLessonResponse = {
  id: string;
  subject: "MATHEMATICS" | "PHYSICS";
  startTime: string;
  endTime: string;
  status:
    | "SCHEDULED"
    | "COMPLETED"
    | "CANCELLED"
    | "RESCHEDULED"
    | "IN_PROGRESS";
};

export type StudentLessonsByWeekResponse = {
  weekStart: string;
  lessons: StudentLessonResponse[];
};

export type TutorIssueInvitationResponse = {
  inviteUrl: string;
  expiresAt: string;
  status: "pending";
};

export type TutorInvitationStatusResponse =
  | { status: "not_issued" }
  | { status: "pending"; createdAt: string; expiresAt: string }
  | { status: "registered"; registeredAt: string; studentEmail: string };

export type ValidateInvitationResponse =
  | { valid: true; studentName: string; tutorName: string }
  | { valid: false };

export type StudentLessonWsEvent =
  | { type: "lesson_created"; lesson: StudentLessonResponse }
  | { type: "lesson_updated"; lesson: StudentLessonResponse }
  | { type: "lesson_deleted"; lessonId: string }
  | {
      type: "lesson_status_updated";
      lessonId: string;
      status: StudentLessonResponse["status"];
    };
