"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../auth");
describe("websocket auth", () => {
    const originalEnv = process.env.JWT_SECRET;
    beforeEach(() => {
        jest.restoreAllMocks();
        process.env.JWT_SECRET = "test-secret";
    });
    afterEach(() => {
        process.env.JWT_SECRET = originalEnv;
    });
    it("should return decoded payload when token is valid", async () => {
        const fakePayload = { userId: "user-1", email: "test@example.com" };
        jest.spyOn(jsonwebtoken_1.default, "verify").mockImplementation(() => fakePayload);
        const ws = {
            close: jest.fn(),
        };
        const request = {
            url: "/?token=valid-token",
        };
        const result = await (0, auth_1.authenticateWebSocket)(ws, request);
        expect(result).toEqual(fakePayload);
        expect(ws.close).not.toHaveBeenCalled();
    });
    it("should close ws and return null when token is missing", async () => {
        const ws = { close: jest.fn() };
        const request = { url: "/" };
        const result = await (0, auth_1.authenticateWebSocket)(ws, request);
        expect(result).toBeNull();
        expect(ws.close).toHaveBeenCalledWith(1008, "No token provided");
    });
    it("should close ws and return null when token is invalid", async () => {
        jest.spyOn(jsonwebtoken_1.default, "verify").mockImplementation(() => {
            throw new Error("invalid token");
        });
        const ws = { close: jest.fn() };
        const request = { url: "/?token=bad" };
        const result = await (0, auth_1.authenticateWebSocket)(ws, request);
        expect(result).toBeNull();
        expect(ws.close).toHaveBeenCalledWith(1008, "Authentication failed");
    });
});
//# sourceMappingURL=auth.test.js.map