import { api, getStudentToken, studentApi } from "@shared";

import type { CallHistoryRecord, CallHistoryResponse } from "../callRecord.types";

export const getCallHistory = async (): Promise<CallHistoryRecord[]> => {
  const isStudent = getStudentToken() !== null;
  const { data } = isStudent
    ? await studentApi.get<CallHistoryResponse>("/student/calls/history")
    : await api.get<CallHistoryResponse>("/calls/history");
  return data.items;
};
