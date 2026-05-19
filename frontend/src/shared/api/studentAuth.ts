import type {
  StudentAuthResponse,
  StudentLoginRequest,
  StudentRegisterByInviteRequest,
  StudentSession,
} from "../types";
import { publicApi, studentApi } from "./studentBase";

export const studentAuthApi = {
  registerByInvite: async (
    data: StudentRegisterByInviteRequest
  ): Promise<StudentAuthResponse> => {
    const response = await publicApi.post(
      "/student-auth/register",
      data
    );
    return response.data;
  },

  login: async (
    data: StudentLoginRequest
  ): Promise<StudentAuthResponse> => {
    const response = await publicApi.post("/student-auth/login", data);
    return response.data;
  },

  verifyEmail: async (
    code: string
  ): Promise<StudentSession> => {
    const response = await studentApi.post("/student-auth/verify-email", {
      code,
    });
    return response.data;
  },

  resendVerification: async (): Promise<void> => {
    await studentApi.post("/student-auth/resend-verification");
  },

  getProfile: async (): Promise<StudentSession> => {
    const response = await studentApi.get("/student-auth/me");
    return response.data;
  },

  logout: async (): Promise<void> => {
    await studentApi.post("/student-auth/logout");
  },
};
