import { api, studentApi } from "@shared";

import type {
  CallHistoryPrincipal,
  CallHistoryRecord,
  CallHistoryResponse,
} from "../callRecord.types";

export const getCallHistory = async (
  principal: CallHistoryPrincipal
): Promise<CallHistoryRecord[]> => {
  const { data } =
    principal === "student"
      ? await studentApi.get<CallHistoryResponse>("/student/calls/history")
      : await api.get<CallHistoryResponse>("/calls/history");
  return data.items;
};

export const getLessonCalls = async (lessonId: string): Promise<CallHistoryRecord[]> => {
  const { data } = await api.get<CallHistoryResponse>(
    `/calls/lessons/${encodeURIComponent(lessonId)}`
  );
  return data.items;
};
