export const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "/api"
    : process.env.REACT_APP_API_URL || "http://localhost:3001/api";

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  STUDENTS: "/students",
  STUDENT_DETAIL: "/students/:id",
  LESSONS: "/lessons",
  LESSON_DETAIL: "/lessons/:id",
  SCHEDULE: "/schedule",
} as const;
