import type {
  InvitationStatusResponse,
  IssuedInvitationResponse,
  ValidateInvitationResponse,
} from "../types";
import { api } from "./base";
import { publicApi } from "./studentBase";

export const studentInvitationsApi = {
  // Tutor side: управление приглашениями в карточке ученика.
  issueInvitation: async (
    studentId: string
  ): Promise<IssuedInvitationResponse> => {
    const response = await api.post(
      `/students/${studentId}/invitations`
    );
    return response.data;
  },

  getStatus: async (studentId: string): Promise<InvitationStatusResponse> => {
    const response = await api.get(`/students/${studentId}/invitations`);
    return response.data;
  },

  revoke: async (studentId: string): Promise<void> => {
    await api.delete(`/students/${studentId}/invitations`);
  },

  // Public: проверка валидности токена со страницы /student-invite/:token.
  validateToken: async (
    token: string
  ): Promise<ValidateInvitationResponse> => {
    const response = await publicApi.get(
      `/student-invitations/validate/${token}`
    );
    return response.data;
  },
};
