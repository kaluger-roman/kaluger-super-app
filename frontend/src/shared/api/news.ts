import type { NewsListResponse } from "../types";
import { api } from "./base";

export const newsApi = {
  getAll: async (page = 1, limit = 20): Promise<NewsListResponse> => {
    const response = await api.get("/news", {
      params: { page, limit },
    });
    return response.data;
  },

  hasUnread: async (): Promise<{ hasUnread: boolean }> => {
    const response = await api.get("/news/has-unread");
    return response.data;
  },

  markRead: async (): Promise<void> => {
    await api.post("/news/mark-read");
  },
};
