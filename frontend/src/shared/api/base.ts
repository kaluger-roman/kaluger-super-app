import axios from "axios";

import { expireTutorSession, getTutorToken } from "../auth";
import { API_BASE_URL } from "../config";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token and timezone to requests
api.interceptors.request.use((config) => {
  const token = getTutorToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers["X-Timezone"] = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      expireTutorSession();
    }
    return Promise.reject(error);
  }
);
