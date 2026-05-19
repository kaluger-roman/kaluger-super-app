import type { StudentLessonsByWeekResponse } from "../types";
import { studentApi } from "./studentBase";

export const studentCabinetApi = {
  getLessonsByWeek: async (
    weekStart?: string
  ): Promise<StudentLessonsByWeekResponse> => {
    const response = await studentApi.get("/student-cabinet/lessons", {
      params: weekStart ? { weekStart } : undefined,
    });
    return response.data;
  },
};
