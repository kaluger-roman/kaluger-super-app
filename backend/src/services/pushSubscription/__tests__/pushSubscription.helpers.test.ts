import { holdsSubscription, isOwnedBy, toOwnerFields } from "../pushSubscription.helpers";

describe("pushSubscription helpers", () => {
  it("should hold a subscription only with both stored keys", () => {
    const stored = { p256dh: "p256", auth: "secret" };

    expect(holdsSubscription(stored, { p256dh: "p256", auth: "secret" })).toBe(true);
    expect(holdsSubscription(stored, { p256dh: "p256", auth: "other!" })).toBe(false);
    expect(holdsSubscription(stored, { p256dh: "other", auth: "secret" })).toBe(false);
    expect(holdsSubscription(stored, { p256dh: "p256", auth: "secre" })).toBe(false);
  });

  it("should give a subscription exactly one owner", () => {
    expect(toOwnerFields({ kind: "tutor", id: "u-1" })).toEqual({
      userId: "u-1",
      studentUserId: null,
    });
    expect(toOwnerFields({ kind: "student", id: "s-1" })).toEqual({
      userId: null,
      studentUserId: "s-1",
    });
  });

  it("should not take a student for a tutor with the same id", () => {
    const tutorOwned = { userId: "id-1", studentUserId: null };

    expect(isOwnedBy(tutorOwned, { kind: "tutor", id: "id-1" })).toBe(true);
    expect(isOwnedBy(tutorOwned, { kind: "student", id: "id-1" })).toBe(false);
    expect(isOwnedBy(tutorOwned, { kind: "tutor", id: "id-2" })).toBe(false);
  });
});
