import { api } from "./base";
import type {
  AuthRequest,
  RegisterRequest,
  AuthResponse,
  User,
  VerifyEmailRequest,
  ResendVerificationRequest,
} from "../types";

export const authApi = {
  login: async (credentials: AuthRequest): Promise<AuthResponse> => {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post("/auth/register", userData);
    return response.data;
  },

  verifyEmail: async (data: VerifyEmailRequest): Promise<AuthResponse> => {
    const response = await api.post("/auth/verify-email", data);
    return response.data;
  },

  resendVerification: async (data: ResendVerificationRequest): Promise<{ message: string }> => {
    const response = await api.post("/auth/resend-verification", data);
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
