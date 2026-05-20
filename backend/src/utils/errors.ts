export class StudentInvitationConsumedError extends Error {
  constructor() {
    super("Student invitation already consumed");
    this.name = "StudentInvitationConsumedError";
  }
}
