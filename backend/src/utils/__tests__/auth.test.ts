import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  validateEmail,
  validatePassword,
} from "../auth";

import { JwtPayload } from "../../types";

describe("auth utils", () => {
  const testPassword = "Str0ngPass";

  it("hashPassword and comparePassword should work", async () => {
    const hash = await hashPassword(testPassword);
    expect(typeof hash).toBe("string");
    const ok = await comparePassword(testPassword, hash);
    expect(ok).toBe(true);
    const bad = await comparePassword("wrong", hash);
    expect(bad).toBe(false);
  });

  it("generateToken and verifyToken should return payload", () => {
    const payload: JwtPayload = { userId: "u1", email: "a@b.c" };
    process.env.JWT_SECRET = "test-secret";
    const token = generateToken(payload);
    expect(typeof token).toBe("string");
    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.email).toBe(payload.email);
  });

  it("verifyToken should return null for invalid token", () => {
    process.env.JWT_SECRET = "test-secret";
    const bad = verifyToken("not-a-token");
    expect(bad).toBeNull();
  });

  it("validateEmail should accept valid emails and reject invalid", () => {
    expect(validateEmail("user@example.com")).toBe(true);
    expect(validateEmail("invalid-email")).toBe(false);
    expect(validateEmail("a@b")).toBe(false);
  });

  it("validatePassword enforces policy", () => {
    expect(validatePassword("Abcdef12")).toBe(true);
    expect(validatePassword("abcdef12")).toBe(false); // missing uppercase
    expect(validatePassword("ABCDEF12")).toBe(false); // missing lowercase
    expect(validatePassword("Abcdefgh")).toBe(false); // missing digit
    expect(validatePassword("A1b2C3d")).toBe(false); // too short
  });

  it("generateToken should throw when JWT_SECRET is not set (regression: hardcoded fallback removed)", () => {
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      expect(() =>
        generateToken({ userId: "u1", email: "a@b.c" })
      ).toThrow(/JWT_SECRET/);
    } finally {
      process.env.JWT_SECRET = original;
    }
  });
});
