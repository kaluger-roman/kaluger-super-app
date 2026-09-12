import type { StudentInvitationView } from "./studentInvitation.types";

export const isInvitationActive = (
  view: StudentInvitationView | null
): boolean => view?.status === "pending";

export const isStudentRegisteredByInvitation = (
  view: StudentInvitationView | null
): boolean => view?.status === "registered";
