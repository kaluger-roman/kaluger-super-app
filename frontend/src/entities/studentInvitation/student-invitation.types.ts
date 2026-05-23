import type { InvitationStatusResponse } from "@shared";

export type StudentInvitationView = InvitationStatusResponse;

export type StudentInvitationKind = StudentInvitationView["status"];
