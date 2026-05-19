import type { StudentSettingsResponse } from "../../types";

export const buildSettingsResponse = (
  studentUser: {
    id: string;
    email: string;
    name: string;
    isEmailVerified: boolean;
  },
  tutorName: string | null
): StudentSettingsResponse => ({
  id: studentUser.id,
  email: studentUser.email,
  name: studentUser.name,
  isEmailVerified: studentUser.isEmailVerified,
  tutor: tutorName ? { name: tutorName } : null,
});
