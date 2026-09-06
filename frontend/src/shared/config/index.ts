const devApiUrl = (): string =>
  process.env.REACT_APP_API_URL || "http://localhost:3001/api";

export const API_BASE_URL =
  process.env.NODE_ENV === "production" ? "/api" : devApiUrl();

export const resolveWsUrl = (path: string): string =>
  process.env.NODE_ENV === "production"
    ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}${path}`
    : `${new URL(devApiUrl()).origin.replace(/^http/, "ws")}${path}`;

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
