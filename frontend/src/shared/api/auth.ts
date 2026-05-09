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

  updateProfile: async (data: { name?: string; taxEnabled?: boolean }): Promise<User> => {
    const response = await api.put("/auth/profile", data);
    return response.data.user;
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ message: string }> => {
    const response = await api.post("/auth/change-password", data);
    return response.data;
  },

  changeEmail: async (data: {
    newEmail: string;
    password: string;
  }): Promise<{ message: string }> => {
    const response = await api.post("/auth/change-email", data);
    return response.data;
  },

  verifyEmailChange: async (data: {
    code: string;
  }): Promise<AuthResponse & { token: string }> => {
    const response = await api.post("/auth/verify-email-change", data);
    return response.data;
  },

  resendEmailChangeCode: async (): Promise<{ message: string }> => {
    const response = await api.post("/auth/resend-email-change-code");
    return response.data;
  },

  forgotPassword: async (data: { email: string }): Promise<{ message: string }> => {
    const response = await api.post("/auth/forgot-password", data);
    return response.data;
  },

  verifyResetToken: async (data: { token: string }): Promise<{ valid: true }> => {
    const response = await api.post("/auth/reset-password/verify", data);
    return response.data;
  },

  resetPassword: async (data: {
    token: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ message: string }> => {
    const response = await api.post("/auth/reset-password", data);
    return response.data;
  },
};
