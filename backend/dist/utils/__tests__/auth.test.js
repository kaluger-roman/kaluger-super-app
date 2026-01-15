"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../auth");
describe("auth utils", () => {
    const testPassword = "Str0ngPass";
    it("hashPassword and comparePassword should work", async () => {
        const hash = await (0, auth_1.hashPassword)(testPassword);
        expect(typeof hash).toBe("string");
        const ok = await (0, auth_1.comparePassword)(testPassword, hash);
        expect(ok).toBe(true);
        const bad = await (0, auth_1.comparePassword)("wrong", hash);
        expect(bad).toBe(false);
    });
    it("generateToken and verifyToken should return payload", () => {
        const payload = { userId: "u1", email: "a@b.c" };
        process.env.JWT_SECRET = "test-secret";
        const token = (0, auth_1.generateToken)(payload);
        expect(typeof token).toBe("string");
        const decoded = (0, auth_1.verifyToken)(token);
        expect(decoded).not.toBeNull();
        expect(decoded?.userId).toBe(payload.userId);
        expect(decoded?.email).toBe(payload.email);
    });
    it("verifyToken should return null for invalid token", () => {
        process.env.JWT_SECRET = "test-secret";
        const bad = (0, auth_1.verifyToken)("not-a-token");
        expect(bad).toBeNull();
    });
    it("validateEmail should accept valid emails and reject invalid", () => {
        expect((0, auth_1.validateEmail)("user@example.com")).toBe(true);
        expect((0, auth_1.validateEmail)("invalid-email")).toBe(false);
        expect((0, auth_1.validateEmail)("a@b")).toBe(false);
    });
    it("validatePassword enforces policy", () => {
        expect((0, auth_1.validatePassword)("Abcdef12")).toBe(true);
        expect((0, auth_1.validatePassword)("abcdef12")).toBe(false); // missing uppercase
        expect((0, auth_1.validatePassword)("ABCDEF12")).toBe(false); // missing lowercase
        expect((0, auth_1.validatePassword)("Abcdefgh")).toBe(false); // missing digit
        expect((0, auth_1.validatePassword)("A1b2C3d")).toBe(false); // too short
    });
});
//# sourceMappingURL=auth.test.js.map