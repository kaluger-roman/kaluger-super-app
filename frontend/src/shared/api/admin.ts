import axios from "axios";

import { API_BASE_URL } from "../config";

const ADMIN_TOKEN_KEY = "adminToken";

export const adminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      if (window.location.pathname.startsWith("/admin")) {
        window.location.href = "/admin";
      }
    }
    return Promise.reject(error);
  }
);

export type AdminOverviewResponse = {
  usersCount: number;
  studentsCount: number;
  lessonsCount: number;
  serverUptime: number;
};

export type BackupSettingsData = {
  enabled: boolean;
  intervalHours: number;
  maxStorageMb: number;
  lastBackupAt: string | null;
};

export type BackupFileData = {
  name: string;
  sizeMb: number;
  createdAt: string;
};

export type BackupSettingsFullResponse = {
  settings: BackupSettingsData;
  files: BackupFileData[];
  totalSizeMb: number;
};

export const adminApiMethods = {
  login: async (email: string, password: string): Promise<{ token: string }> => {
    const response = await adminApi.post("/admin/login", { email, password });
    return response.data;
  },

  getOverview: async (): Promise<AdminOverviewResponse> => {
    const response = await adminApi.get("/admin/overview");
    return response.data;
  },

  getBackupSettings: async (): Promise<BackupSettingsFullResponse> => {
    const response = await adminApi.get("/admin/backup/settings");
    return response.data;
  },

  updateBackupSettings: async (data: {
    enabled?: boolean;
    intervalHours?: number;
    maxStorageMb?: number;
  }): Promise<BackupSettingsData> => {
    const response = await adminApi.put("/admin/backup/settings", data);
    return response.data;
  },

  createBackup: async (): Promise<BackupFileData> => {
    const response = await adminApi.post("/admin/backup/create");
    return response.data;
  },
};
