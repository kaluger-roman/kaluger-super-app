import { api } from "./base";
import type { AuthRequest, RegisterRequest, AuthResponse, User } from "../types";

export const authApi = {
  login: async (credentials: AuthRequest): Promise<AuthResponse> => {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post("/auth/register", userData);
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get("/auth/profile");
    return response.data.user;
  },

  updateProfile: async (data: { name: string }): Promise<User> => {
    const response = await api.put("/auth/profile", data);
    return response.data.user;
  },
};
