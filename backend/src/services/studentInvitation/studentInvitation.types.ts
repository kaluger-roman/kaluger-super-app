export type IssueInvitationResult =
  | { ok: true; inviteUrl: string; expiresAt: Date }
  | {
      ok: false;
      reason:
        | "student_not_found"
        | "not_owner"
        | "archived"
        | "already_registered";
    };

export type RevokeInvitationResult =
  | { ok: true; revoked: boolean }
  | { ok: false; reason: "student_not_found" | "not_owner" };

export type ValidateTokenResult =
  | {
      ok: true;
      invitation: { id: string; studentId: string; tutorId: string };
      studentName: string;
      tutorName: string;
    }
  | { ok: false };
