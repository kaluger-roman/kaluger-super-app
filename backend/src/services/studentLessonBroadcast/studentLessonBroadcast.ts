import { getWebSocketManager } from "../../lib/wsManager";
import type { StudentLessonWsEvent } from "../../types";
import {
  getStudentUserIdByLessonId,
  toStudentLessonPayload,
} from "../studentCabinet";
import type { LessonForBroadcast } from "./studentLessonBroadcast.types";

// Centralized broadcasts to a student client when a lesson changes.
// Caller is responsible for awaiting (or fire-and-forget) — мы никогда не
// бросаем наружу, чтобы WS-сбой не ломал основной flow мутации урока.

export const broadcastStudentLessonCreated = async (
  lesson: LessonForBroadcast
): Promise<void> => {
  try {
    const wsManager = getWebSocketManager();
    if (!wsManager) return;
    const studentUserId = await getStudentUserIdByLessonId(lesson.id);
    if (!studentUserId) return;
    const event: StudentLessonWsEvent = {
      type: "lesson_created",
      lesson: toStudentLessonPayload(lesson),
    };
    wsManager.broadcastStudentLessonEvent(studentUserId, event);
  } catch (error) {
    console.error("broadcastStudentLessonCreated failed:", error);
  }
};

export const broadcastStudentLessonUpdated = async (
  lesson: LessonForBroadcast
): Promise<void> => {
  try {
    const wsManager = getWebSocketManager();
    if (!wsManager) return;
    const studentUserId = await getStudentUserIdByLessonId(lesson.id);
    if (!studentUserId) return;
    const event: StudentLessonWsEvent = {
      type: "lesson_updated",
      lesson: toStudentLessonPayload(lesson),
    };
    wsManager.broadcastStudentLessonEvent(studentUserId, event);
  } catch (error) {
    console.error("broadcastStudentLessonUpdated failed:", error);
  }
};

export const broadcastStudentLessonDeleted = async (
  lessonId: string,
  studentUserId: string | null
): Promise<void> => {
  try {
    const wsManager = getWebSocketManager();
    if (!wsManager || !studentUserId) return;
    const event: StudentLessonWsEvent = {
      type: "lesson_deleted",
      lessonId,
    };
    wsManager.broadcastStudentLessonEvent(studentUserId, event);
  } catch (error) {
    console.error("broadcastStudentLessonDeleted failed:", error);
  }
};

export const broadcastStudentLessonStatusUpdated = async (
  lessonId: string,
  status: LessonForBroadcast["status"]
): Promise<void> => {
  try {
    const wsManager = getWebSocketManager();
    if (!wsManager) return;
    const studentUserId = await getStudentUserIdByLessonId(lessonId);
    if (!studentUserId) return;
    const event: StudentLessonWsEvent = {
      type: "lesson_status_updated",
      lessonId,
      status,
    };
    wsManager.broadcastStudentLessonEvent(studentUserId, event);
  } catch (error) {
    console.error("broadcastStudentLessonStatusUpdated failed:", error);
  }
};
