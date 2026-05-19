import axios from "axios";

import { getStudentToken, clearStudentToken } from "../auth";
import { API_BASE_URL } from "../config";

export const studentApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

studentApi.interceptors.request.use((config) => {
  const token = getStudentToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers["X-Timezone"] =
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  return config;
});

studentApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStudentToken();
      if (
        window.location.pathname !== "/login" &&
        !window.location.pathname.startsWith("/student-invite")
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// publicApi — без авторизационных заголовков, для эндпоинтов вроде
// /api/student-invitations/validate/:token и /api/student-auth/register.
export const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
